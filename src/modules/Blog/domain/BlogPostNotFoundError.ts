import { NotFoundError } from '../../../shared/domain/NotFoundError';

// Público: cubre tanto el slug inexistente como el de un borrador (AC2 de la épica).
export class BlogPostNotFoundError extends NotFoundError {
  constructor(public readonly slug: string) {
    super(`Blog post with slug "${slug}" was not found`);
    this.name = 'BlogPostNotFoundError';
  }
}
