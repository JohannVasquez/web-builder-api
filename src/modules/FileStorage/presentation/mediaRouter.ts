import { Router, type RequestHandler } from 'express';
import type { MediaController } from './MediaController';

// Montado bajo `/api/admin/tenants/:tenantId/media`, detrás del middleware de actor.
export const createMediaRouter = (
  controller: MediaController,
  fileUploadMiddleware: RequestHandler,
): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', controller.list);
  router.post('/', fileUploadMiddleware, controller.upload);
  router.patch('/:key', controller.describe);
  router.delete('/:key', controller.remove);
  return router;
};
