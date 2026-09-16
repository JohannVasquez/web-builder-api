import { NotFoundError } from '../../../shared/domain/NotFoundError';

export class ProductNotFoundError extends NotFoundError {
  constructor(reference: string | number) {
    super(`No existe un producto "${String(reference)}" en este cliente.`);
  }
}
