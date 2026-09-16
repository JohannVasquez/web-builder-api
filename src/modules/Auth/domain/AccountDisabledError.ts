import { UnauthorizedError } from '../../../shared/domain/UnauthorizedError';

export class AccountDisabledError extends UnauthorizedError {
  constructor() {
    super('Esta cuenta está desactivada. Pídele a un administrador que la reactive.');
  }
}
