import { Router } from 'express';
import type { PageController } from './PageController';

export const createPageRouter = (controller: PageController): Router => {
  const router = Router();
  router.get('/', controller.listPublished);
  router.get('/:slug', controller.getBySlug);
  return router;
};
