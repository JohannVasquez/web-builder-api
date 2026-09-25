import { Router } from 'express';
import type { AdminSiteQualityReviewController } from './AdminSiteQualityReviewController';

export const createAdminSiteQualityReviewRouter = (
  controller: AdminSiteQualityReviewController,
): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', controller.review);
  return router;
};
