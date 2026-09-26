import { Router, type NextFunction, type Request, type Response } from 'express';
import { ForbiddenError } from '@/shared/domain/ForbiddenError';
import {
  getRequestActor,
  requirePermission,
} from '@/modules/ApiKey/presentation/actorMiddleware';
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

// Borrar es solo del owner o de una clave `full` (que ya exige el permiso por método). Un
// editor también tiene `full` en el panel, así que aquí se mira el rol: los vendedores crean,
// extienden y descartan, pero no borran.
export const requireDemoDeleter = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const actor = getRequestActor(res);
  if (actor.type === 'admin' && actor.role !== 'owner') {
    throw new ForbiddenError(
      'Borrar una demo es solo para la persona dueña de la cuenta. Si el prospecto dijo que no, descártala: se borra sola al terminar el período de gracia.',
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
  router.get('/:demoId/visits', controller.listVisits);
  router.post('/:demoId/extend', controller.extend);
  router.patch('/:demoId/expiry', controller.updateExpiry);
  // Convertir y descartar cambian el destino de la demo: con una clave, solo `full`. Owner y
  // editores ya tienen `full` en el panel. Recuperar deshace un descarte y basta con `write`.
  router.post('/:demoId/convert', requirePermission('full'), controller.convert);
  router.post('/:demoId/discard', requirePermission('full'), controller.discard);
  router.post('/:demoId/restore', controller.restore);
  router.delete('/:demoId', requireDemoDeleter, controller.remove);
  return router;
};
