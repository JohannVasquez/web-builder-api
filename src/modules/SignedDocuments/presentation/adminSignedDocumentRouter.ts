import { Router } from 'express';
import type { AdminSignedDocumentController } from './AdminSignedDocumentController';

export const createAdminSignedDocumentRouter = (
  controller: AdminSignedDocumentController,
): Router => {
  const router = Router();

  // Todos estos endpoints requieren permisos plenos que se validan
  // a nivel de app.js con adminGuards y scopes específicos.
  // Pero ojo: app.use monta en /api/admin/signed-documents

  // registrar una firma
  router.post('/', controller.register);

  // clientes en versión anterior
  router.get('/outdated', controller.listOutdated);

  // consultar qué firmó un cliente
  router.get('/tenant/:tenantId', controller.listByTenant);

  return router;
};
