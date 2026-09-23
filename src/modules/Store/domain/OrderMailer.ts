import type { Order } from './Order';

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class OrderMailer {
  public abstract sendBuyerConfirmation(order: Order, storeName: string): Promise<void>;
  public abstract sendOwnerNotice(
    order: Order,
    storeName: string,
    recipient: string,
  ): Promise<void>;
}
