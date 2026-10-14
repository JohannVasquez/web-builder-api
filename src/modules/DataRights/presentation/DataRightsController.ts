import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestTenant } from '@/modules/Tenant/presentation/tenantResolver';
import { TooManyRequestsError } from '@/shared/domain/TooManyRequestsError';
import { idSchema } from '@/shared/domain/identifier';
import { isDemoRequest } from '@/shared/presentation/demoRequest';
import type { RateLimiter } from '@/modules/ApiKey/application/RateLimiter';
import { DataRightsRequestSchema, REQUEST_STATUSES } from '../domain/DataRightsRequest';
import type { SubmitDataRightsRequestUseCase } from '../application/SubmitDataRightsRequestUseCase';
import type { VerifyDataRightsRequestUseCase } from '../application/VerifyDataRightsRequestUseCase';
import type { ListDataRightsRequestsUseCase } from '../application/ListDataRightsRequestsUseCase';
import type { ResolveDataRightsRequestUseCase } from '../application/ResolveDataRightsRequestUseCase';

// Pedir los datos de alguien es barato de mandar y caro de atender: 3 por minuto y por IP
// deja pasar a una persona y corta el abuso.
const REQUESTS_PER_MINUTE = 3;

const TokenParamsSchema = z.object({ token: z.string().max(64) });
const ListQuerySchema = z.object({
  status: z.enum(REQUEST_STATUSES).optional(),
});
const ResolveBodySchema = z.strictObject({
  outcome: z.enum(['resuelta', 'rechazada']),
});

export class DataRightsController {
  constructor(
    private readonly submitUseCase: SubmitDataRightsRequestUseCase,
    private readonly verifyUseCase: VerifyDataRightsRequestUseCase,
    private readonly listUseCase: ListDataRightsRequestsUseCase,
    private readonly resolveUseCase: ResolveDataRightsRequestUseCase,
    private readonly rateLimiter: RateLimiter,
  ) {}

  public readonly submit = async (req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    this.enforceRateLimit(req, tenant.id);

    const input = DataRightsRequestSchema.parse(req.body);
    // En una demo no se guarda ni se manda el correo de verificación: sin él la solicitud no
    // se podría confirmar, y el correo iría a una persona que solo estaba probando.
    if (!isDemoRequest(res)) {
      const origin = `${req.protocol}://${req.get('host') ?? ''}`;
      await this.submitUseCase.execute(
        tenant.id,
        input,
        (token) => `${origin}/datos/verificar/${token}`,
      );
    }

    // La misma respuesta exista o no ese correo en la base: por la respuesta, nadie puede
    // averiguar si otra persona es cliente de este sitio.
    res.status(202).json({
      success: true,
      message:
        'Si ese correo está en nuestros registros, te mandamos un enlace para confirmar la solicitud.',
    });
  };

  public readonly verify = async (req: Request, res: Response): Promise<void> => {
    const { token } = TokenParamsSchema.parse(req.params);
    // El token vale en toda la plataforma: desde una demo no se confirma nada, porque
    // confirmar manda el resultado por correo.
    const outcome = isDemoRequest(res)
      ? ({ kind: 'invalido' } as const)
      : await this.verifyUseCase.execute(token);

    if (outcome.kind === 'invalido') {
      res.status(404).json({
        success: false,
        message: 'Este enlace ya no sirve. Vuelve a presentar tu solicitud.',
      });
      return;
    }

    res.json({
      success: true,
      resolved: outcome.kind === 'atendida',
      message:
        outcome.kind === 'atendida'
          ? 'Listo. Te mandamos el resultado por correo.'
          : 'Confirmada. Revisaremos tu solicitud y te responderemos dentro del plazo legal.',
    });
  };

  public readonly list = async (req: Request, res: Response): Promise<void> => {
    const tenantId = idSchema.parse(req.params.tenantId);
    const { status } = ListQuerySchema.parse(req.query);
    res.json({ requests: await this.listUseCase.execute(tenantId, status ?? null) });
  };

  public readonly resolve = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.requestId);
    const { outcome } = ResolveBodySchema.parse(req.body);
    await this.resolveUseCase.execute(id, outcome);
    res.status(204).send();
  };

  private enforceRateLimit(req: Request, tenantId: string): void {
    const key = `data-rights:${tenantId}:${req.ip ?? 'desconocida'}`;
    const decision = this.rateLimiter.check(key, REQUESTS_PER_MINUTE);
    if (!decision.allowed) {
      throw new TooManyRequestsError(
        `Recibimos varias solicitudes desde tu conexión. Espera ${decision.retryAfterSeconds} segundos.`,
        decision.retryAfterSeconds,
      );
    }
  }
}
