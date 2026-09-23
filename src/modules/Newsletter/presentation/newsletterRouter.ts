import { Router } from 'express';
import type { NewsletterController } from './NewsletterController';

// Público, scoped por dominio del visitante: lo usa el bloque de suscripción del sitio.
export const createNewsletterRouter = (controller: NewsletterController): Router => {
  const router = Router();
  router.post('/', controller.subscribe);
  return router;
};

/**
 * Montado fuera del resolutor de tenant, en `/api/newsletter-baja/:token`: el enlace llega
 * por correo y puede abrirse desde cualquier dominio, incluido el de un cliente de otro
 * tenant. El token es único en toda la plataforma, así que identifica solo.
 */
export const createUnsubscribeRouter = (controller: NewsletterController): Router => {
  const router = Router();
  router.get('/:token', controller.unsubscribe);
  router.post('/:token', controller.unsubscribe);
  return router;
};

// Montado bajo `/api/admin/tenants/:tenantId/subscribers`, detrás del middleware de actor.
export const createAdminNewsletterRouter = (controller: NewsletterController): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', controller.list);
  router.get('/export.csv', controller.exportCsv);
  return router;
};
