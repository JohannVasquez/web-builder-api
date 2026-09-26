import type { Order } from './Order';
import type { SellerIdentity } from './StoreSettings';

/**
 * Lo que la Ley 19.496 exige que acompañe a la confirmación de una compra a distancia, además
 * del detalle del pedido: con quién se contrató y en qué condiciones.
 */
export interface OrderMailContext {
  readonly storeName: string;
  readonly seller: SellerIdentity;
  /** Dirección de los términos de compra vigentes al confirmar; nula si la tienda no los exige. */
  readonly termsUrl: string | null;
  /** Versión exacta de esos términos, para que "los vigentes" no sea ambiguo después. */
  readonly termsVersion: string | null;
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class OrderMailer {
  public abstract sendBuyerConfirmation(
    order: Order,
    context: OrderMailContext,
  ): Promise<void>;
  public abstract sendOwnerNotice(
    order: Order,
    context: OrderMailContext,
    recipient: string,
  ): Promise<void>;
}
