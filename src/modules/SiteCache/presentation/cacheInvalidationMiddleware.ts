import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { InvalidateTenantCacheUseCase } from '../application/InvalidateTenantCacheUseCase';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Invalida la caché del tenant afectado después de cada escritura admin.
 *
 * Va como middleware y no dentro de cada caso de uso a propósito: así toda
 * ruta admin nueva (y todo lo que el MCP haga sobre las mismas rutas) queda
 * cubierta sin que nadie tenga que acordarse. Se engancha a `res.on('finish')`
 * para no invalidar cuando la operación falló.
 *
 * El aviso sale en segundo plano (`void`): la respuesta al panel no debe
 * quedar esperando a que el frontend conteste.
 */
export const createCacheInvalidationMiddleware = (
  useCase: InvalidateTenantCacheUseCase,
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    const tenantId = Number(req.params.tenantId);
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      next();
      return;
    }

    res.on('finish', () => {
      if (res.statusCode >= 400) {
        return;
      }
      void useCase.execute(tenantId);
    });
    next();
  };
};
