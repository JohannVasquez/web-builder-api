import { Router, type RequestHandler } from 'express';
import type { AdminTenantController } from './AdminTenantController';

// Montado bajo `/api/admin/tenants`, detrás del middleware de actor. Listar es de todos
// (cada quien ve los suyos); crear clientes y tocar dominios o estado es de la agencia.
export const createAdminTenantRouter = (
  controller: AdminTenantController,
  requireStaff: RequestHandler,
): Router => {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', requireStaff, controller.create);
  router.patch('/:tenantId/status', requireStaff, controller.changeStatus);
  router.get('/:tenantId/domains', requireStaff, controller.listDomains);
  router.post('/:tenantId/domains', requireStaff, controller.addDomain);
  router.post(
    '/:tenantId/domains/:domainId/verify',
    requireStaff,
    controller.verifyDomain,
  );
  router.patch(
    '/:tenantId/domains/:domainId/primary',
    requireStaff,
    controller.setPrimaryDomain,
  );
  router.delete('/:tenantId/domains/:domainId', requireStaff, controller.removeDomain);
  return router;
};
