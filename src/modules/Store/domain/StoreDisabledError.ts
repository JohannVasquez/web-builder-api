import { NotFoundError } from '@/shared/domain/NotFoundError';

// 404 y no 403: para quien visita, un cliente sin tienda simplemente no tiene tienda.
export class StoreDisabledError extends NotFoundError {
  constructor() {
    super('Este sitio no tiene tienda.');
  }
}
