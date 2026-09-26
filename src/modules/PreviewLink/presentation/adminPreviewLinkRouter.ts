import { Router } from 'express';
import type { AdminPreviewLinkController } from './AdminPreviewLinkController';

export const createAdminPreviewLinkRouter = (
  controller: AdminPreviewLinkController,
): Router => {
  const router = Router({ mergeParams: true });
  router.post('/', controller.generate);
  router.delete('/:id', controller.revoke);
  return router;
};
