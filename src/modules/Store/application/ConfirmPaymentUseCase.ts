import type { CouponRepository } from '../domain/CouponRepository';
import type { Order } from '../domain/Order';
import type { OrderMailContext, OrderMailer } from '../domain/OrderMailer';
import type { OrderRepository } from '../domain/OrderRepository';
import type { PaymentGatewayRegistry } from '../domain/PaymentGateway';
import type { StoreSettingsRepository } from '../domain/StoreSettingsRepository';

export class ConfirmPaymentUseCase {
  constructor(
    private readonly storeSettingsRepository: StoreSettingsRepository,
    private readonly orderRepository: OrderRepository,
    private readonly couponRepository: CouponRepository,
    private readonly gateways: PaymentGatewayRegistry,
    private readonly mailer: OrderMailer,
  ) {}

  public async execute(
    tenantId: string,
    storeName: string,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<{ confirmed: boolean }> {
    const settings = await this.storeSettingsRepository.find(tenantId);
    if (!settings.acceptsOnlinePayment()) {
      return { confirmed: false };
    }

    const gateway = this.gateways.for(settings.paymentProvider);
    const confirmation = await gateway.confirm(payload, settings);
    if (!confirmation.paid) {
      return { confirmed: false };
    }

    const order = await this.orderRepository.findByPaymentReference(
      tenantId,
      confirmation.reference,
    );
    // El proveedor puede avisar más de una vez del mismo pago: marcar dos veces
    // descontaría el stock dos veces y gastaría el cupón dos veces.
    if (order === null || order.status !== 'pending') {
      return { confirmed: false };
    }

    const paid = await this.orderRepository.markPaid(
      tenantId,
      order.id,
      confirmation.reference,
    );
    await this.orderRepository.discountStock(tenantId, order.id);
    if (order.couponCode !== null) {
      await this.couponRepository.registerUse(tenantId, order.couponCode);
    }
    const terms = await this.termsFor(tenantId, settings);
    await this.notify(
      paid,
      {
        storeName,
        seller: settings.seller,
        termsUrl: terms.url,
        termsVersion: paid.termsVersion,
      },
      settings.notificationEmail,
    );

    return { confirmed: true };
  }

  // La página de términos vive en el sitio del cliente; el correo enlaza a ella y no la copia,
  // para que el enlace siga sirviendo aunque el texto se corrija después.
  private termsFor(
    _tenantId: string,
    settings: { termsPageSlug: string | null },
  ): Promise<{ url: string | null }> {
    return Promise.resolve({
      url: settings.termsPageSlug === null ? null : `/${settings.termsPageSlug}`,
    });
  }

  /**
   * Que falle un correo no puede deshacer un pago que ya ocurrió, pero tampoco puede perderse
   * en silencio: el fallo queda registrado en el pedido para poder reintentarlo.
   */
  private async notify(
    order: Order,
    context: OrderMailContext,
    ownerEmail: string | null,
  ): Promise<void> {
    await this.sendAndRecord(order, context);
    if (ownerEmail !== null) {
      await this.mailer
        .sendOwnerNotice(order, context, ownerEmail)
        .catch(() => undefined);
    }
  }

  private async sendAndRecord(order: Order, context: OrderMailContext): Promise<void> {
    try {
      await this.mailer.sendBuyerConfirmation(order, context);
      await this.orderRepository.markConfirmationEmailed(order.id, new Date(), null);
    } catch (error) {
      await this.orderRepository.markConfirmationEmailed(
        order.id,
        null,
        error instanceof Error ? error.message : 'Error desconocido',
      );
    }
  }
}
