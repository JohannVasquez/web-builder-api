import { BadRequestError } from '@/shared/domain/BadRequestError';

export class SectionPositionConflictError extends BadRequestError {
  constructor(public readonly position: number) {
    super(`Ya existe una sección en la posición ${position} de esta página`);
    this.name = 'SectionPositionConflictError';
  }
}
