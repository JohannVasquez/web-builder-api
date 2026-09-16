import { BadRequestError } from '../../../shared/domain/BadRequestError';

export class InvalidSalePriceError extends BadRequestError {
  constructor() {
    super('El precio de oferta tiene que ser menor que el precio normal.');
  }
}
