import { Router } from 'express';
import type { StoreController } from './StoreController';
import type { AdminStoreController } from './AdminStoreController';

// Público, scoped por el dominio del visitante.
export const createStoreRouter = (controller: StoreController): Router => {
  const router = Router();
  router.get('/', controller.list);
  router.get('/destacados', controller.featured);
  router.get('/:slug', controller.get);
  return router;
};

export const createProductCategoryRouter = (controller: StoreController): Router => {
  const router = Router();
  router.get('/', controller.categories);
  return router;
};

// Montado bajo `/api/admin/tenants/:tenantId/products`, detrás del middleware de actor.
export const createAdminStoreRouter = (controller: AdminStoreController): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/categories', controller.listCategories);
  router.post('/categories', controller.createCategory);
  router.patch('/categories/:categoryId', controller.updateCategory);
  router.delete('/categories/:categoryId', controller.removeCategory);
  router.get('/:productId', controller.get);
  router.patch('/:productId', controller.update);
  router.delete('/:productId', controller.remove);
  return router;
};
