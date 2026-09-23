import { UnprocessableEntityError } from '@/shared/domain/UnprocessableEntityError';
import { RETRACTO_DIAS } from '@/modules/Store/domain/consumerRights';

/**
 * 422 y no 400: la petición está bien formada, lo que no da es el plazo. El mensaje dice
 * cuántos días son y ofrece el otro camino, porque fuera de plazo todavía queda reclamar.
 */
export class WithdrawalOutOfWindowError extends UnprocessableEntityError {
  constructor() {
    super(
      `El derecho a retracto vence a los ${String(RETRACTO_DIAS)} días de recibir el ` +
        'producto. Si tu caso es otro, puedes presentarlo como reclamo.',
    );
  }
}
