import { Router } from 'express';
import type { ContactController } from './ContactController';

export const createContactRouter = (controller: ContactController): Router => {
  const router = Router();
  router.post('/', controller.send);
  return router;
};
