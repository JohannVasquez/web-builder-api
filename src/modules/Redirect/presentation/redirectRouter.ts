import { Router } from 'express';
import type { RedirectController } from './RedirectController';

// Público: el sitio lo consulta en cada ruta que no encuentra, antes de servir un 404.
export const createRedirectRouter = (controller: RedirectController): Router => {
  const router = Router();
  router.get('/', controller.resolve);
  return router;
};

// Montado bajo `/api/admin/tenants/:tenantId/redirecciones`, detrás del middleware de actor.
export const createAdminRedirectRouter = (controller: RedirectController): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.delete('/:redirectId', controller.remove);
  return router;
};
