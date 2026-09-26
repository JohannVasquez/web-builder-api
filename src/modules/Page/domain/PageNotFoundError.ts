import { NotFoundError } from '@/shared/domain/NotFoundError';

export class PageNotFoundError extends NotFoundError {
  constructor(public readonly slug: string) {
    super(`Page with slug "${slug}" was not found`);
    this.name = 'PageNotFoundError';
  }
}
