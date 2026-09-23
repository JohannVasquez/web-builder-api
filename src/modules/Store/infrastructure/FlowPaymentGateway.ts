import { createHmac } from 'node:crypto';
import type {
  PaymentConfirmation,
  PaymentContext,
  PaymentGateway,
  PaymentStart,
} from '../domain/PaymentGateway';
import type { Order } from '../domain/Order';
import type { StoreSettings } from '../domain/StoreSettings';
import { CheckoutRejectedError } from '../domain/CheckoutRejectedError';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const SANDBOX_URL = 'https://sandbox.flow.cl/api';
const PRODUCTION_URL = 'https://www.flow.cl/api';

// Flow firma cada llamada con HMAC-SHA256 sobre los parámetros ordenados por nombre y
// concatenados sin separadores. Exportada para poder probar la firma sin llamar a Flow.
export const signFlowParams = (
  params: Readonly<Record<string, string>>,
  secretKey: string,
): string => {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join('');
  return createHmac('sha256', secretKey).update(payload).digest('hex');
};

export const isFlowPaid = (status: unknown): boolean => status === 2;

export class FlowPaymentGateway implements PaymentGateway {
  public readonly provider = 'flow';

  constructor(
    private readonly fetchFn: FetchLike = (input, init) => fetch(input, init),
  ) {}

  public async start(
    order: Order,
    settings: StoreSettings,
    context: PaymentContext,
  ): Promise<PaymentStart> {
    const { apiKey, secretKey } = this.credentialsOf(settings);
    const params: Record<string, string> = {
      apiKey,
      commerceOrder: order.number,
      subject: `Pedido ${order.number}`,
      currency: order.currency,
      amount: String(order.totalCents),
      email: order.customer.email,
      urlConfirmation: context.confirmationUrl,
      urlReturn: context.returnUrl,
    };

    const body = await this.call(settings, 'payment/create', params, secretKey);
    const url = body.url;
    const token = body.token;
    if (typeof url !== 'string' || typeof token !== 'string') {
      throw new CheckoutRejectedError(
        'No pudimos abrir el pago. Inténtalo de nuevo en unos minutos.',
      );
    }

    return { reference: token, redirectUrl: `${url}?token=${token}`, instructions: null };
  }

  // Flow avisa con un `token` y nada más: el estado real hay que preguntárselo a Flow.
  // Confiar en el cuerpo del aviso dejaría marcar pedidos como pagados a cualquiera.
  public async confirm(
    payload: Readonly<Record<string, unknown>>,
    settings: StoreSettings,
  ): Promise<PaymentConfirmation> {
    const token = payload.token;
    if (typeof token !== 'string' || token === '') {
      throw new CheckoutRejectedError('El aviso de pago llegó sin token.');
    }

    const { apiKey, secretKey } = this.credentialsOf(settings);
    const body = await this.call(
      settings,
      'payment/getStatus',
      { apiKey, token },
      secretKey,
      'GET',
    );

    return { reference: token, paid: isFlowPaid(body.status) };
  }

  private async call(
    settings: StoreSettings,
    path: string,
    params: Record<string, string>,
    secretKey: string,
    method: 'GET' | 'POST' = 'POST',
  ): Promise<Record<string, unknown>> {
    const signed = { ...params, s: signFlowParams(params, secretKey) };
    const query = new URLSearchParams(signed).toString();
    const base = this.baseUrlOf(settings);

    const response =
      method === 'GET'
        ? await this.fetchFn(`${base}/${path}?${query}`)
        : await this.fetchFn(`${base}/${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: query,
          });

    if (!response.ok) {
      throw new CheckoutRejectedError(
        'El medio de pago rechazó la operación. Revisa los datos e inténtalo otra vez.',
      );
    }
    return (await response.json()) as Record<string, unknown>;
  }

  private baseUrlOf(settings: StoreSettings): string {
    return settings.paymentCredentials.mode === 'production'
      ? PRODUCTION_URL
      : SANDBOX_URL;
  }

  private credentialsOf(settings: StoreSettings): { apiKey: string; secretKey: string } {
    const { apiKey, secretKey } = settings.paymentCredentials;
    if (apiKey === undefined || secretKey === undefined) {
      throw new CheckoutRejectedError(
        'La tienda todavía no tiene configurada su cuenta de cobro.',
      );
    }
    return { apiKey, secretKey };
  }
}
