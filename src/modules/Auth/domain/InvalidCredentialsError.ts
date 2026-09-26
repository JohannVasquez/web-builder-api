import { UnauthorizedError } from '@/shared/domain/UnauthorizedError';

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('Correo o contraseña incorrectos');
    this.name = 'InvalidCredentialsError';
  }
}
