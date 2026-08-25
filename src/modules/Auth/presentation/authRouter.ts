import { Router } from 'express';
import type { AuthController } from './AuthController';

export const createAuthRouter = (controller: AuthController): Router => {
  const router = Router();
  router.post('/login', controller.login);
  return router;
};
