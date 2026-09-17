import type { Order } from './Order';
import type { StoreSettings } from './StoreSettings';

export interface PaymentStart {
  // Identificador del pago en el proveedor; queda guardado para poder conciliar después.
  readonly reference: string;
  // `null` cuando no hay a dónde mandar a la persona (ej. transferencia).
  readonly redirectUrl: string | null;
  readonly instructions: string | null;
}

export interface PaymentContext {
  // A dónde vuelve la persona después de pagar.
  readonly returnUrl: string;
  // A dónde avisa el proveedor. Va sobre el dominio del cliente porque es el único host
  // que enruta hacia la API con ese tenant resuelto.
  readonly confirmationUrl: string;
}

export interface PaymentConfirmation {
  readonly reference: string;
  readonly paid: boolean;
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class PaymentGateway {
  public abstract readonly provider: string;
  public abstract start(
    order: Order,
    settings: StoreSettings,
    context: PaymentContext,
  ): Promise<PaymentStart>;
  // Traduce lo que manda el proveedor a "este pedido quedó pagado" o no. Nunca confía en
  // lo que venga en el cuerpo: vuelve a preguntarle al proveedor cuando corresponde.
  public abstract confirm(
    payload: Readonly<Record<string, unknown>>,
    settings: StoreSettings,
  ): Promise<PaymentConfirmation>;
}

export class UnsupportedPaymentProviderError extends Error {
  constructor(provider: string) {
    super(`No sabemos cobrar con "${provider}".`);
    this.name = 'UnsupportedPaymentProviderError';
  }
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class PaymentGatewayRegistry {
  public abstract for(provider: string): PaymentGateway;
}
