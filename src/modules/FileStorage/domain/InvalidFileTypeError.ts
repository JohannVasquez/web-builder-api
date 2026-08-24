import { BadRequestError } from '../../../shared/domain/BadRequestError';
import { ALLOWED_MIME_TYPES } from './AllowedMimeTypes';

export class InvalidFileTypeError extends BadRequestError {
  constructor(mimeType: string) {
    super(
      `Tipo de archivo no permitido: ${mimeType}. Tipos aceptados: ${ALLOWED_MIME_TYPES.join(', ')}.`,
    );
    this.name = 'InvalidFileTypeError';
  }
}
