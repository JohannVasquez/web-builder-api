import { BadRequestError } from '../../../shared/domain/BadRequestError';

export class TenantSlugConflictError extends BadRequestError {
  constructor(slug: string) {
    super(`Ya existe un cliente con el identificador "${slug}". Elige otro.`);
  }
}
