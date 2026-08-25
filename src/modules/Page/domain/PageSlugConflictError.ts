import { BadRequestError } from '../../../shared/domain/BadRequestError';

export class PageSlugConflictError extends BadRequestError {
  constructor(public readonly slug: string) {
    super(`Ya existe una página con el slug "${slug}" en este tenant`);
    this.name = 'PageSlugConflictError';
  }
}
