import { Router } from 'express';
import type { NewsletterController } from './NewsletterController';

// Público, scoped por dominio del visitante: lo usa el bloque de suscripción del sitio.
export const createNewsletterRouter = (controller: NewsletterController): Router => {
  const router = Router();
  router.post('/', controller.subscribe);
  return router;
};

// Montado bajo `/api/admin/tenants/:tenantId/subscribers`, detrás del middleware de actor.
export const createAdminNewsletterRouter = (controller: NewsletterController): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', controller.list);
  router.get('/export.csv', controller.exportCsv);
  return router;
};
