import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { BadRequestError } from '@/shared/domain/BadRequestError';
import { ConflictError } from '@/shared/domain/ConflictError';
import { UnprocessableEntityError } from '@/shared/domain/UnprocessableEntityError';
import { getRequestTenant } from '@/modules/Tenant/presentation/tenantResolver';
import type { IdempotencyStore } from '../domain/IdempotencyStore';
import { isValidIdempotencyKey, requestHash } from '../domain/requestHash';

export const IDEMPOTENCY_HEADER = 'idempotency-key';

// Envuelve un endpoint que crea algo (una compra) para que repetirlo con la misma clave
// devuelva el resultado de la primera vez en vez de hacerlo de nuevo. Sin clave se comporta
// igual que antes: la clave es una garantía que el cliente pide, no un requisito.
export const createIdempotency = (
  store: IdempotencyStore,
  scope: string,
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers[IDEMPOTENCY_HEADER];
    const key = Array.isArray(header) ? header[0] : header;
    if (key === undefined || key === '') {
      next();
      return;
    }
    if (!isValidIdempotencyKey(key)) {
      throw new BadRequestError(
        'La clave de idempotencia debe tener entre 8 y 255 letras, números, guiones o guiones bajos.',
      );
    }

    const tenant = getRequestTenant(res);
    const claim = await store.claim(tenant.id, scope, key, requestHash(req.body));

    if (claim.kind === 'replay') {
      res.setHeader('Idempotent-Replayed', 'true');
      res.status(claim.response.status).json(claim.response.body);
      return;
    }
    if (claim.kind === 'mismatch') {
      throw new UnprocessableEntityError(
        'Esta clave ya se usó para una compra distinta. Genera una clave nueva para esta.',
      );
    }
    if (claim.kind === 'in-progress') {
      throw new ConflictError(
        'Tu compra anterior todavía se está procesando. Espera un momento antes de reintentar.',
        2,
      );
    }

    // Solo una respuesta exitosa se recuerda. Si la compra falló no quedó nada hecho, así que
    // la clave se suelta para que la persona pueda corregir y reintentar.
    // Se guarda ANTES de responder: si se guardara después, un reintento que llegue justo al
    // recibir la respuesta encontraría la clave todavía en curso y recibiría un 409.
    const originalJson = res.json.bind(res);
    res.json = (body: unknown): Response => {
      const status = res.statusCode;
      const settle =
        status >= 200 && status < 300
          ? store.complete(tenant.id, scope, key, { status, body })
          : store.release(tenant.id, scope, key);
      // Si guardar falla, la compra igual ocurrió: la respuesta se manda de todos modos.
      void settle
        .catch(() => undefined)
        .finally(() => {
          originalJson(body);
        });
      return res;
    };

    next();
  };
};
