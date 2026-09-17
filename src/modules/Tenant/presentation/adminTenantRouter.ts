import { Router } from 'express';
import type { AdminTenantController } from './AdminTenantController';

// Montado bajo `/api/admin/tenants`, detrás del middleware de actor.
export const createAdminTenantRouter = (controller: AdminTenantController): Router => {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.patch('/:tenantId/status', controller.changeStatus);
  router.get('/:tenantId/domains', controller.listDomains);
  router.post('/:tenantId/domains', controller.addDomain);
  router.post('/:tenantId/domains/:domainId/verify', controller.verifyDomain);
  router.patch('/:tenantId/domains/:domainId/primary', controller.setPrimaryDomain);
  router.delete('/:tenantId/domains/:domainId', controller.removeDomain);
  return router;
};
