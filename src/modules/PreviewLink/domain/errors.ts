import { NotFoundError } from '@/shared/domain/NotFoundError';
import { ForbiddenError } from '@/shared/domain/ForbiddenError';

export class PreviewLinkNotFoundError extends NotFoundError {
  constructor() {
    super('El enlace de revisión no existe.');
    this.name = 'PreviewLinkNotFoundError';
  }
}

export class PreviewLinkRevokedError extends ForbiddenError {
  constructor() {
    super('El enlace de revisión fue anulado y ya no es válido.');
    this.name = 'PreviewLinkRevokedError';
  }
}

export class PreviewLinkExpiredError extends ForbiddenError {
  constructor() {
    super('El enlace de revisión ha vencido.');
    this.name = 'PreviewLinkExpiredError';
  }
}
