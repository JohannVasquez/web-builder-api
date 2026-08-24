import { NotFoundError } from '../../../shared/domain/NotFoundError';

export class TenantNotFoundError extends NotFoundError {
  constructor(domain: string | undefined) {
    super(
      domain === undefined
        ? 'No existe un tenant por defecto configurado'
        : `No existe un tenant para el dominio "${domain}"`,
    );
    this.name = 'TenantNotFoundError';
  }
}
