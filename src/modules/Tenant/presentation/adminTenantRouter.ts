import { Router } from 'express';
import type { AdminTenantController } from './AdminTenantController';

// Montado bajo `/api/admin/tenants`, detrás del middleware de actor.
export const createAdminTenantRouter = (controller: AdminTenantController): Router => {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  return router;
};
