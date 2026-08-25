import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { NotFoundError } from '../domain/NotFoundError';
import { BadRequestError } from '../domain/BadRequestError';
import { PayloadTooLargeError } from '../domain/PayloadTooLargeError';
import { UnauthorizedError } from '../domain/UnauthorizedError';

export class ErrorHandler {
  public readonly handle = (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ): void => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'ValidationError',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    if (error instanceof NotFoundError) {
      res.status(404).json({ error: 'NotFound', message: error.message });
      return;
    }

    if (error instanceof BadRequestError) {
      res.status(400).json({ error: 'BadRequest', message: error.message });
      return;
    }

    if (error instanceof PayloadTooLargeError) {
      res.status(413).json({ error: 'PayloadTooLarge', message: error.message });
      return;
    }

    if (error instanceof UnauthorizedError) {
      res.status(401).json({ error: 'Unauthorized', message: error.message });
      return;
    }

    console.error('[UnhandledError]', error);
    res.status(500).json({ error: 'InternalServerError' });
  };
}
