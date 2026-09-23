import { Router } from 'express';
import type { AdminNavigationController } from './AdminNavigationController';

// Montado bajo `/api/admin/tenants/:tenantId/navigation`, detrás del middleware de actor.
export const createAdminNavigationRouter = (
  controller: AdminNavigationController,
): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', controller.list);
  router.put('/', controller.replace);
  return router;
};
