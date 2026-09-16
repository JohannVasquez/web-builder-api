import { Router } from 'express';
import type { ActivityLogController } from './ActivityLogController';

// Montado bajo `/api/admin/activity`, detrás del middleware de actor.
export const createActivityLogRouter = (controller: ActivityLogController): Router => {
  const router = Router();
  router.get('/', controller.list);
  return router;
};
