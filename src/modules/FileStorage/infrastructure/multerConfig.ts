import multer, { MulterError } from 'multer';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { BadRequestError } from '@/shared/domain/BadRequestError';
import { FileTooLargeError } from '../domain/FileTooLargeError';

/**
 * Parseo de multipart/form-data en memoria: los archivos son pequeños
 * (≤ MAX_FILE_SIZE_MB) y se reenvían directo al bucket sin tocar disco.
 * Los errores propios de multer se traducen a errores de dominio para que
 * el ErrorHandler compartido los mapee a 413/400.
 */
export const createFileUploadMiddleware = (maxFileSizeBytes: number): RequestHandler => {
  const parseSingleFile = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSizeBytes, files: 1 },
  }).single('file');

  return (req: Request, res: Response, next: NextFunction): void => {
    parseSingleFile(req, res, (error: unknown) => {
      if (error instanceof MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          next(new FileTooLargeError(maxFileSizeBytes / (1024 * 1024)));
          return;
        }
        next(new BadRequestError(`Petición multipart inválida: ${error.code}`));
        return;
      }
      next(error);
    });
  };
};
