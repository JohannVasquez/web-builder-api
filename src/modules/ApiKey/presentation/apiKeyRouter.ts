import { Router } from 'express';
import type { ApiKeyController } from './ApiKeyController';

// Montado bajo `/api/admin/api-keys`, detrás del middleware de actor.
export const createApiKeyRouter = (controller: ApiKeyController): Router => {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.delete('/:apiKeyId', controller.revoke);
  router.post('/:apiKeyId/regenerate', controller.regenerate);
  return router;
};
