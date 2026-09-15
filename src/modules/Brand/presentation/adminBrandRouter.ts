import { Router } from 'express';
import type { AdminBrandController } from './AdminBrandController';

// Montado bajo `/api/admin/tenants/:tenantId/brand`, detrás de `adminAuthMiddleware`.
export const createAdminBrandRouter = (controller: AdminBrandController): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', controller.get);
  router.patch('/', controller.update);
  return router;
};
