import type {
  PaymentConfirmation,
  PaymentGateway,
  PaymentStart,
} from '../domain/PaymentGateway';
import type { Order } from '../domain/Order';
import type { StoreSettings } from '../domain/StoreSettings';

// Transferencia bancaria: sirve sin contratar nada. El pedido queda pendiente hasta que
// la persona dueña de la tienda confirma que llegó la plata.
export class TransferPaymentGateway implements PaymentGateway {
  public readonly provider = 'transfer';

  public start(order: Order, settings: StoreSettings): Promise<PaymentStart> {
    const bank = settings.paymentCredentials;
    const lines = [
      `Transfiere $${order.totalCents.toLocaleString('es-CL')} a:`,
      bank.accountName === undefined ? null : `Nombre: ${bank.accountName}`,
      bank.rut === undefined ? null : `RUT: ${bank.rut}`,
      bank.bank === undefined ? null : `Banco: ${bank.bank}`,
      bank.accountType === undefined ? null : `Tipo de cuenta: ${bank.accountType}`,
      bank.accountNumber === undefined ? null : `Cuenta: ${bank.accountNumber}`,
      bank.email === undefined ? null : `Correo: ${bank.email}`,
      '',
      `Escribe el número de pedido ${order.number} en el mensaje de la transferencia.`,
    ].filter((line): line is string => line !== null);

    return Promise.resolve({
      reference: order.number,
      redirectUrl: null,
      instructions: lines.join('\n'),
    });
  }

  // Nadie confirma una transferencia desde afuera: la confirma el panel a mano.
  public confirm(): Promise<PaymentConfirmation> {
    return Promise.resolve({ reference: '', paid: false });
  }
}
