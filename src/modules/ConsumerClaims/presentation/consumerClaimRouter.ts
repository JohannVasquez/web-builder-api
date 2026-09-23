import { Router } from 'express';
import type { ConsumerClaimController } from './ConsumerClaimController';

// Público y sin sesión: quien se retracta o reclama es un comprador, no un usuario del panel.
// La ley pide que revertir la compra sea tan simple como hacerla.
export const createConsumerClaimRouter = (
  controller: ConsumerClaimController,
): Router => {
  const router = Router();
  router.post('/', controller.submit);
  return router;
};

// Montado bajo `/api/admin/tenants/:tenantId/reclamos`, detrás del middleware de actor.
export const createAdminConsumerClaimRouter = (
  controller: ConsumerClaimController,
): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', controller.list);
  router.patch('/:claimId', controller.resolve);
  return router;
};
