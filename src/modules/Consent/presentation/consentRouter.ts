import { Router } from 'express';
import type { ConsentController } from './ConsentController';

// Público y scoped por dominio del visitante: lo llaman el aviso de cookies y los formularios
// del sitio. No exige sesión porque quien consiente es un visitante anónimo.
export const createConsentRouter = (controller: ConsentController): Router => {
  const router = Router();
  router.post('/', controller.record);
  router.get('/current', controller.current);
  return router;
};
