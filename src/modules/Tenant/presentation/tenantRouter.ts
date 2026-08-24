import { Router } from 'express';
import type { TenantController } from './TenantController';

/**
 * Rutas internas del módulo Tenant. Se montan fuera de `/api` porque no son
 * para el frontend sino para la capa de borde (Caddy), y no deberían quedar
 * expuestas a internet.
 */
export const createTenantInternalRouter = (controller: TenantController): Router => {
  const router = Router();
  router.get('/domains/allowed', controller.checkDomainAllowed);
  return router;
};
