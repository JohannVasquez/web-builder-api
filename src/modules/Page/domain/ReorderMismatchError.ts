import { BadRequestError } from '@/shared/domain/BadRequestError';

/** El set de ids a reordenar no coincide exactamente con las secciones de la página. */
export class ReorderMismatchError extends BadRequestError {
  constructor() {
    super('La lista de secciones a reordenar no coincide con las secciones de la página');
    this.name = 'ReorderMismatchError';
  }
}
