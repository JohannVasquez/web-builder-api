import { BadRequestError } from '../../../shared/domain/BadRequestError';

export class ProductSlugConflictError extends BadRequestError {
  constructor(slug: string) {
    super(
      `Ya existe un producto con la dirección "${slug}" en este cliente. Elige otra.`,
    );
  }
}
