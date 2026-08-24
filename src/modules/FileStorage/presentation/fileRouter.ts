import { Router, type RequestHandler } from 'express';
import type { FileController } from './FileController';

/**
 * El middleware de parseo multipart se inyecta desde la raíz de composición
 * (igual que el controller) para que esta capa no dependa de infrastructure.
 */
export const createFileRouter = (
  controller: FileController,
  fileUploadMiddleware: RequestHandler,
): Router => {
  const router = Router();
  router.post('/', fileUploadMiddleware, controller.upload);
  router.delete('/:key', controller.remove);
  return router;
};
