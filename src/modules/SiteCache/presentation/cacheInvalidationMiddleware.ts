import { isUuid } from '@/shared/domain/identifier';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { InvalidateTenantCacheUseCase } from '../application/InvalidateTenantCacheUseCase';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Middleware y no caso de uso: cubre toda ruta admin futura sin que nadie tenga que acordarse.
// Se engancha a `finish` para no invalidar cuando la operación falló; el aviso sale en segundo plano.
export const createCacheInvalidationMiddleware = (
  useCase: InvalidateTenantCacheUseCase,
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    const tenantId = typeof req.params.tenantId === 'string' ? req.params.tenantId : '';
    if (!isUuid(tenantId)) {
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
