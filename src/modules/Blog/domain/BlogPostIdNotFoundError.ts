import { NotFoundError } from '@/shared/domain/NotFoundError';

export class BlogPostIdNotFoundError extends NotFoundError {
  constructor(public readonly id: string) {
    super(`Blog post with id ${id} was not found`);
    this.name = 'BlogPostIdNotFoundError';
  }
}
