import { Router } from 'express';
import type { GlobalSettingsController } from './GlobalSettingsController';

export const createGlobalSettingsRouter = (
  controller: GlobalSettingsController,
): Router => {
  const router = Router();
  router.get('/', controller.get);
  return router;
};
