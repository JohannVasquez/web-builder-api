import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { NotFoundError } from '@/shared/domain/NotFoundError';
import {
  getDemoRequestAccess,
  markDemoRequest,
  NOT_FOUND_MESSAGE,
} from '@/shared/presentation/demoRequest';
import { getRequestTenant } from '@/modules/Tenant/presentation/tenantResolver';
import type { ValidateDemoAccessUseCase } from '../application/ValidateDemoAccessUseCase';
import type { RecordDemoVisitUseCase } from '../application/RecordDemoVisitUseCase';

export const DEMO_TOKEN_HEADER = 'x-demo-token';

const PAGE_SLUG_PATH = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/;

// Va después de resolver el tenant y antes de `siteAvailability`, en TODAS las rutas públicas
// scoped por tenant (hay una prueba en app.spec.ts que falla si una ruta nueva se la salta).
// Para un tenant que no es demo no hace nada: ni headers ni consultas.
export const createDemoGuard = (
  validateAccess: ValidateDemoAccessUseCase,
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenant = getRequestTenant(res);
    if (!tenant.isDemo()) {
      next();
      return;
    }

    // Con o sin acceso: ningún buscador indexa una demo y ninguna caché intermedia la guarda,
    // ni siquiera su 404.
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'private, no-store');

    const header = req.headers[DEMO_TOKEN_HEADER];
    const token = Array.isArray(header) ? header[0] : header;
    const access =
      token === undefined || token === ''
        ? null
        : await validateAccess.execute(tenant.id, token);

    // Sin 403 ni código propio: la respuesta es la de algo que no existe.
    if (access === null) {
      throw new NotFoundError(NOT_FOUND_MESSAGE);
    }

    markDemoRequest(res, access);
    res.setHeader('X-Demo', 'true');
    next();
  };
};

// Cada página servida al prospecto es una visita; al equipo no se le cuenta nada, o el dato
// dejaría de decir si el prospecto abrió su demo. Se registra al terminar la respuesta: la
// página no espera a la base ni se entera si el registro falla. Va montado solo en
// `/api/pages`: es la única ruta que corresponde a "abrió una página".
export const createDemoVisitTracker = (
  recordVisit: RecordDemoVisitUseCase,
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const access = getDemoRequestAccess(res);
    const slug = PAGE_SLUG_PATH.exec(req.path)?.[1];
    if (access?.kind === 'prospect' && req.method === 'GET' && slug !== undefined) {
      res.on('finish', () => {
        if (res.statusCode !== 200) {
          return;
        }
        // Envuelto en una promesa para que ni un fallo síncrono escape del evento.
        Promise.resolve()
          .then(() =>
            recordVisit.execute(access.demoId, {
              pageSlug: slug,
              ip: req.ip,
              userAgent: req.get('user-agent'),
            }),
          )
          .catch((error: unknown) => {
            console.error('[Demo] No se pudo registrar la visita:', error);
          });
      });
    }
    next();
  };
};
