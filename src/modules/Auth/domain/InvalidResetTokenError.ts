import { BadRequestError } from '../../../shared/domain/BadRequestError';

export class InvalidResetTokenError extends BadRequestError {
  constructor() {
    super('El enlace de recuperación no es válido o ya expiró. Pide uno nuevo.');
  }
}
