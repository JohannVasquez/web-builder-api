import { Router } from 'express';
import type { AdminContactMessageController } from './AdminContactMessageController';

// Montado bajo `/api/admin/tenants/:tenantId/messages`, detrás del middleware de actor.
export const createAdminContactMessageRouter = (
  controller: AdminContactMessageController,
): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', controller.list);
  router.get('/export.csv', controller.exportCsv);
  router.patch('/:messageId', controller.markRead);
  return router;
};
