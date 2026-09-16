import { Router } from 'express';
import type { AdminUserController } from './AdminUserController';

export const createAdminUserRouter = (controller: AdminUserController): Router => {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.invite);
  router.patch('/:id/role', controller.changeRole);
  router.patch('/:id/status', controller.setDisabled);
  return router;
};
