import { NotFoundError } from '@/shared/domain/NotFoundError';

export class SectionNotFoundError extends NotFoundError {
  constructor(public readonly id: string) {
    super(`Section with id ${id} was not found on this page`);
    this.name = 'SectionNotFoundError';
  }
}
