import { Router, type NextFunction, type Request, type Response } from 'express';
import { ForbiddenError } from '@/shared/domain/ForbiddenError';
import { getRequestActor } from '@/modules/ApiKey/presentation/actorMiddleware';
import type { AdminDemoController } from './AdminDemoController';

// Las demos son trabajo de la agencia sobre prospectos que todavía no son clientes: una clave
// limitada a ciertos clientes no alcanza a ninguna demo (ni a la que crearía).
export const requireUnscopedActor = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (getRequestActor(res).tenantScope !== null) {
    throw new ForbiddenError(
      'Las demos son de la agencia: esta clave está limitada a algunos clientes y no alcanza a las demos.',
    );
  }
  next();
};

// Montado bajo `/api/admin/demos`, detrás del actor, `requireStaff` y el permiso por método.
export const createAdminDemoRouter = (controller: AdminDemoController): Router => {
  const router = Router();
  router.use(requireUnscopedActor);
  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:demoId', controller.get);
  router.patch('/:demoId/prospect', controller.updateProspect);
  router.post('/:demoId/prospect-link', controller.regenerateProspectLink);
  router.post('/:demoId/team-link', controller.regenerateTeamLink);
  return router;
};
