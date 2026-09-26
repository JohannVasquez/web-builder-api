import { Router } from 'express';
import type { BlogController } from './BlogController';
import type { AdminBlogController } from './AdminBlogController';

// Público, scoped por el dominio del visitante.
export const createBlogRouter = (controller: BlogController): Router => {
  const router = Router();
  router.get('/', controller.list);
  router.get('/:slug', controller.get);
  return router;
};

// Montado bajo `/api/admin/tenants/:tenantId/posts`, detrás del middleware de actor.
export const createAdminBlogRouter = (controller: AdminBlogController): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:postId', controller.get);
  router.patch('/:postId', controller.update);
  router.delete('/:postId', controller.remove);
  return router;
};
