import { NotFoundError } from '@/shared/domain/NotFoundError';

export class PageIdNotFoundError extends NotFoundError {
  constructor(public readonly id: string) {
    super(`Page with id ${id} was not found`);
    this.name = 'PageIdNotFoundError';
  }
}
