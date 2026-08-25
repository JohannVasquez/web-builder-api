import { Router } from 'express';
import type { AdminTenantController } from './AdminTenantController';

/** Montado bajo `/api/admin/tenants`, detrás de `adminAuthMiddleware`. */
export const createAdminTenantRouter = (controller: AdminTenantController): Router => {
  const router = Router();
  router.get('/', controller.list);
  return router;
};
