import { TooManyRequestsError } from '../../../shared/domain/TooManyRequestsError';

export class AccountLockedError extends TooManyRequestsError {
  constructor(retryAfterSeconds: number) {
    super(
      `Demasiados intentos fallidos. Espera ${Math.ceil(retryAfterSeconds / 60)} minutos antes de volver a intentar.`,
      retryAfterSeconds,
    );
  }
}
