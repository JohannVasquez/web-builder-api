import { Router } from 'express';
import type { AdminSubscriptionController } from './AdminSubscriptionController';
import { requirePermission } from '@/modules/ApiKey/presentation/actorMiddleware';

export const createAdminSubscriptionRouter = (
  controller: AdminSubscriptionController,
): Router => {
  const router = Router({ mergeParams: true });
  
  router.get('/', controller.statusAction);
  router.put('/', controller.updateAction);
  // POST here is restricted to 'full'
  router.post('/payments', requirePermission('full'), controller.registerPaymentAction);
  
  return router;
};

export const createAdminSubscriptionOverviewRouter = (
  controller: AdminSubscriptionController,
): Router => {
  const router = Router();
  router.get('/export', requirePermission('full'), controller.exportAction);
  router.get('/', requirePermission('full'), controller.overviewAction);
  return router;
};
