import { Router } from 'express';
import type { DataRightsController } from './DataRightsController';

// Público: quien ejerce un derecho sobre sus datos es un visitante, no un usuario con sesión.
export const createDataRightsRouter = (controller: DataRightsController): Router => {
  const router = Router();
  router.post('/', controller.submit);
  router.get('/verificar/:token', controller.verify);
  return router;
};

// Montado bajo `/api/admin/tenants/:tenantId/solicitudes-datos`, detrás del middleware de actor.
export const createAdminDataRightsRouter = (controller: DataRightsController): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', controller.list);
  router.patch('/:requestId', controller.resolve);
  return router;
};
