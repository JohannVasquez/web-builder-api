import { Router } from 'express';
import type { AdminGlobalSettingsController } from './AdminGlobalSettingsController';

export const createAdminGlobalSettingsRouter = (
  controller: AdminGlobalSettingsController,
): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', controller.get);
  router.put('/', controller.update);
  return router;
};
