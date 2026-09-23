import { Router, type RequestHandler } from 'express';
import type { CheckoutController } from './CheckoutController';
import type { AdminOrderController } from './AdminOrderController';

// Público, scoped por el dominio del visitante.
// `idempotency` solo envuelve la compra: cotizar no crea nada, repetirlo no hace daño.
export const createCheckoutRouter = (
  controller: CheckoutController,
  idempotency: RequestHandler,
): Router => {
  const router = Router();
  router.get('/', controller.settings);
  router.post('/quote', controller.quote);
  router.post('/checkout', idempotency, controller.checkout);
  // El proveedor de pago avisa acá; no hay sesión que valga, se confirma preguntándole a él.
  router.post('/payment-callback', controller.confirm);
  router.get('/payment-callback', controller.confirm);
  return router;
};

// Montado bajo `/api/admin/tenants/:tenantId/store`, detrás del middleware de actor.
export const createAdminOrderRouter = (controller: AdminOrderController): Router => {
  const router = Router({ mergeParams: true });
  router.get('/settings', controller.getSettings);
  router.patch('/settings', controller.saveSettings);
  router.get('/coupons', controller.listCoupons);
  router.post('/coupons', controller.createCoupon);
  router.patch('/coupons/:couponId', controller.updateCoupon);
  router.delete('/coupons/:couponId', controller.removeCoupon);
  router.get('/report', controller.report);
  router.get('/orders', controller.listOrders);
  router.get('/orders/:orderId', controller.getOrder);
  router.patch('/orders/:orderId/status', controller.changeOrderStatus);
  return router;
};
