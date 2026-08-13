import { Router } from 'express';
import type { NavigationController } from './NavigationController';

export const createNavigationRouter = (controller: NavigationController): Router => {
  const router = Router();
  router.get('/', controller.get);
  return router;
};
