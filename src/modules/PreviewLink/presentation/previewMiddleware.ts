import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ValidatePreviewTokenUseCase } from '../application/ValidatePreviewTokenUseCase';
import { getRequestTenant } from '@/modules/Tenant/presentation/tenantResolver';

export const PREVIEW_TOKEN_HEADER = 'x-preview-token';

export const createPreviewMiddleware = (
  validateUseCase: ValidatePreviewTokenUseCase,
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers[PREVIEW_TOKEN_HEADER];
    const token = Array.isArray(header) ? header[0] : header;

    if (!token) {
      res.locals.isPreview = false;
      next();
      return;
    }

    try {
      const validLink = await validateUseCase.execute(token);
      const tenant = getRequestTenant(res);
      
      // El token tiene que coincidir con el tenant resuelto por el dominio.
      if (validLink.tenantId !== tenant.id) {
        res.status(403).json({
          error: 'El enlace de revisión no corresponde a este sitio.',
          code: 'preview_link_tenant_mismatch',
        });
        return;
      }

      res.locals.isPreview = true;
      
      // Agregamos un header en la respuesta para que la webapp sepa que está en vista previa.
      // Opcionalmente la webapp lo puede usar para mostrar la advertencia visual.
      res.setHeader('X-Is-Preview', 'true');
      
      next();
    } catch (error: unknown) {
      // Retornar errores claros y distinguibles como pide el criterio.
      if (error instanceof Error) {
        if (error.name === 'PreviewLinkExpiredError') {
          res.status(403).json({ error: error.message, code: 'preview_link_expired' });
          return;
        }
        if (error.name === 'PreviewLinkRevokedError') {
          res.status(403).json({ error: error.message, code: 'preview_link_revoked' });
          return;
        }
        if (error.name === 'PreviewLinkNotFoundError') {
          res.status(404).json({ error: error.message, code: 'preview_link_not_found' });
          return;
        }
      }
      next(error);
    }
  };
};

export const isRequestPreview = (res: Response): boolean => {
  return (res.locals as { isPreview?: boolean }).isPreview === true;
};
