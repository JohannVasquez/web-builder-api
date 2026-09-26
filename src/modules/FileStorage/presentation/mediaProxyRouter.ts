import { Router } from 'express';
import type { MediaProxyController } from './MediaProxyController';

/**
 * Público y bajo el dominio del cliente: `next/image` lo pide desde el propio sitio, así que
 * tiene que resolverse por Host como el resto del contenido público.
 */
export const createMediaProxyRouter = (controller: MediaProxyController): Router => {
  const router = Router();
  router.get('/:key', controller.get);
  return router;
};
