import { UnprocessableEntityError } from '@/shared/domain/UnprocessableEntityError';

/**
 * Encender la tienda sin términos de compra publicados o sin identificar al vendedor deja
 * vendiendo sin condiciones aceptadas y sin proveedor identificable: es justo el escenario
 * que sanciona el Reglamento de Comercio Electrónico.
 *
 * 422 y no 400: la petición está bien formada, lo que falta son datos del cliente.
 *
 * El error enumera TODO lo que falta, no el primer hueco: quien llena el formulario merece
 * saber de una vez lo que le queda.
 */
export class StoreCannotBeEnabledError extends UnprocessableEntityError {
  constructor(public readonly missing: readonly string[]) {
    super(`No se puede encender la tienda. Falta: ${missing.join(', ')}.`);
    this.name = 'StoreCannotBeEnabledError';
  }
}
