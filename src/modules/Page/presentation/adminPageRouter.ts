import { Router } from 'express';
import type { AdminPageController } from './AdminPageController';

// Montado bajo `/api/admin/tenants/:tenantId/pages`, detrás del middleware de actor.
export const createAdminPageRouter = (controller: AdminPageController): Router => {
  const router = Router({ mergeParams: true });

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:pageId', controller.get);
  router.patch('/:pageId', controller.update);
  router.delete('/:pageId', controller.remove);

  router.post('/:pageId/sections', controller.addSection);
  router.patch('/:pageId/sections/:sectionId', controller.updateSection);
  router.delete('/:pageId/sections/:sectionId', controller.deleteSection);
  router.put('/:pageId/sections/reorder', controller.reorderSections);

  router.post('/:pageId/publish', controller.publish);
  router.get('/:pageId/versions', controller.listVersions);
  router.post('/:pageId/versions/:versionId/restore', controller.restoreVersion);

  return router;
};
