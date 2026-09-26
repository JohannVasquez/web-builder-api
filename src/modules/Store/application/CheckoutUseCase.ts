import { CheckoutRejectedError } from '../domain/CheckoutRejectedError';
import { StoreDisabledError } from '../domain/StoreDisabledError';
import type { CheckoutInput, Order } from '../domain/Order';
import type { OrderRepository } from '../domain/OrderRepository';
import type { PaymentContext, PaymentGatewayRegistry } from '../domain/PaymentGateway';
import type { QuoteCartUseCase } from './QuoteCartUseCase';
import type { PageRepository } from '@/modules/Page/domain/PageRepository';
import type { StoreSettings } from '../domain/StoreSettings';

export interface CheckoutResult {
  readonly order: Order;
  readonly redirectUrl: string | null;
  readonly instructions: string | null;
}

export class CheckoutUseCase {
  constructor(
    private readonly quoteCartUseCase: QuoteCartUseCase,
    private readonly orderRepository: OrderRepository,
    private readonly gateways: PaymentGatewayRegistry,
    private readonly pageRepository: PageRepository,
  ) {}

  // Los términos que rigen hoy, o nulo si la tienda no los exige. Solo cuentan si la página
  // está publicada: no se puede pedir aceptar algo que el comprador no puede leer.
  public async activeTerms(
    tenantId: string,
    settings: StoreSettings,
  ): Promise<{ slug: string; version: string } | null> {
    if (settings.termsPageSlug === null) {
      return null;
    }
    const publishedAt = await this.pageRepository.findPublishedAt(
      tenantId,
      settings.termsPageSlug,
    );
    return publishedAt === null
      ? null
      : { slug: settings.termsPageSlug, version: publishedAt.toISOString() };
  }

  public async execute(
    tenantId: string,
    input: CheckoutInput,
    context: PaymentContext,
    now = new Date(),
  ): Promise<CheckoutResult> {
    const settings = await this.quoteCartUseCase.settingsFor(tenantId);
    if (!settings.isEnabled) {
      throw new StoreDisabledError();
    }

    const quote = await this.quoteCartUseCase.execute(tenantId, input, now);
    const shipping = this.resolveShipping(input, quote.shipping);

    // Se valida en la API, no solo en el sitio: una compra por la API directa tampoco puede
    // saltarse los términos.
    const terms = await this.activeTerms(tenantId, settings);
    if (terms !== null && !input.acceptedTerms) {
      throw new CheckoutRejectedError(
        'Para comprar tienes que aceptar los términos y condiciones de compra.',
      );
    }

    const order = await this.orderRepository.create(tenantId, {
      customer: input.customer,
      delivery: {
        method: input.delivery.method,
        shippingCode: shipping?.code ?? null,
        shippingName: shipping?.name ?? null,
        addressLine: input.delivery.addressLine,
        addressCity: input.delivery.addressCity,
        addressRegion: input.delivery.addressRegion,
        addressNotes: input.delivery.addressNotes,
      },
      lines: quote.lines,
      subtotalCents: quote.totals.subtotalCents,
      discountCents: quote.totals.discountCents,
      shippingCents: quote.totals.shippingCents,
      taxCents: quote.totals.taxCents,
      totalCents: quote.totals.totalCents,
      currency: quote.currency,
      couponCode: quote.coupon?.code ?? null,
      paymentProvider: settings.paymentProvider,
      termsAcceptedAt: terms === null ? null : now,
      termsVersion: terms?.version ?? null,
      // Copia, no referencia: el pedido tiene que poder decir con quién se contrató aunque
      // el cliente cambie su razón social después.
      seller: settings.seller,
    });

    if (!settings.acceptsOnlinePayment()) {
      return { order, redirectUrl: null, instructions: null };
    }

    const gateway = this.gateways.for(settings.paymentProvider);
    const payment = await gateway.start(order, settings, {
      returnUrl: input.returnUrl ?? context.returnUrl,
      confirmationUrl: context.confirmationUrl,
    });
    await this.orderRepository.setPaymentReference(tenantId, order.id, payment.reference);

    return {
      order,
      redirectUrl: payment.redirectUrl,
      instructions: payment.instructions,
    };
  }

  // La dirección se exige según la forma de envío elegida, no según el método: hay
  // despachos que se coordinan después y retiros que no piden nada.
  private resolveShipping(
    input: CheckoutInput,
    shipping: { code: string; name: string; requiresAddress: boolean } | null,
  ): { code: string; name: string } | null {
    if (input.delivery.method === 'pickup') {
      return null;
    }
    if (shipping === null) {
      throw new CheckoutRejectedError('Elige una forma de envío para continuar.');
    }
    if (shipping.requiresAddress && (input.delivery.addressLine ?? '') === '') {
      throw new CheckoutRejectedError(
        'Necesitamos tu dirección para despachar el pedido.',
      );
    }
    return shipping;
  }
}
