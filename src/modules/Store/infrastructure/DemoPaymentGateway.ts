import {
  DEMO_PAYMENT_PROVIDER,
  type PaymentConfirmation,
  type PaymentContext,
  type PaymentGateway,
  type PaymentStart,
} from '../domain/PaymentGateway';
import type { Order } from '../domain/Order';
import type { StoreSettings } from '../domain/StoreSettings';

// Medio de pago de las demos de prospecto: no habla con nadie. Devuelve a la persona a la
// misma URL de retorno que usaría un pago real, para que el sitio muestre su confirmación
// normal. El pedido lo marca pagado el checkout, no un aviso del proveedor.
export class DemoPaymentGateway implements PaymentGateway {
  public readonly provider = DEMO_PAYMENT_PROVIDER;

  public start(
    order: Order,
    _settings: StoreSettings,
    context: PaymentContext,
  ): Promise<PaymentStart> {
    return Promise.resolve({
      reference: `demo-${order.number}`,
      redirectUrl: context.returnUrl,
      instructions: null,
    });
  }

  // Nadie confirma desde afuera un pago que no existió.
  public confirm(): Promise<PaymentConfirmation> {
    return Promise.resolve({ reference: '', paid: false });
  }
}
