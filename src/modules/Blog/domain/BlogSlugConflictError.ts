import { BadRequestError } from '../../../shared/domain/BadRequestError';

export class BlogSlugConflictError extends BadRequestError {
  constructor(public readonly slug: string) {
    super(`Ya existe una publicación con el slug "${slug}" en este tenant`);
    this.name = 'BlogSlugConflictError';
  }
}
