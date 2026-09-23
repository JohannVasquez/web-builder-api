import { Router } from 'express';
import type { AuthController } from './AuthController';

export const createAuthRouter = (controller: AuthController): Router => {
  const router = Router();
  router.post('/login', controller.login);
  router.post('/forgot-password', controller.forgotPassword);
  router.post('/reset-password', controller.resetPassword);
  return router;
};
