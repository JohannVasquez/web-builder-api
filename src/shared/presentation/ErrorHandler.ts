import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { NotFoundError } from '../domain/NotFoundError';
import { BadRequestError } from '../domain/BadRequestError';
import { ConflictError } from '../domain/ConflictError';
import { UnprocessableEntityError } from '../domain/UnprocessableEntityError';
import { PayloadTooLargeError } from '../domain/PayloadTooLargeError';
import { UnauthorizedError } from '../domain/UnauthorizedError';
import { ForbiddenError } from '../domain/ForbiddenError';
import { TooManyRequestsError } from '../domain/TooManyRequestsError';

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

    if (error instanceof ConflictError) {
      if (error.retryAfterSeconds !== null) {
        res.setHeader('Retry-After', String(error.retryAfterSeconds));
      }
      res.status(409).json({ error: 'Conflict', message: error.message });
      return;
    }

    if (error instanceof UnprocessableEntityError) {
      res.status(422).json({ error: 'UnprocessableEntity', message: error.message });
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

    if (error instanceof ForbiddenError) {
      res.status(403).json({ error: 'Forbidden', message: error.message });
      return;
    }

    if (error instanceof TooManyRequestsError) {
      res.setHeader('Retry-After', String(error.retryAfterSeconds));
      res.status(429).json({
        error: 'TooManyRequests',
        message: error.message,
        retryAfterSeconds: error.retryAfterSeconds,
      });
      return;
    }

    console.error('[UnhandledError]', error);
    res.status(500).json({ error: 'InternalServerError' });
  };
}
