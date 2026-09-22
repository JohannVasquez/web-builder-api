import type { CouponRepository } from '../domain/CouponRepository';
import type { Order } from '../domain/Order';
import type { OrderMailer } from '../domain/OrderMailer';
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
    await this.notify(paid, storeName, settings.notificationEmail);

    return { confirmed: true };
  }

  // Que falle un correo no puede deshacer un pago que ya ocurrió.
  private async notify(
    order: Order,
    storeName: string,
    ownerEmail: string | null,
  ): Promise<void> {
    await this.mailer.sendBuyerConfirmation(order, storeName).catch(() => undefined);
    if (ownerEmail !== null) {
      await this.mailer
        .sendOwnerNotice(order, storeName, ownerEmail)
        .catch(() => undefined);
    }
  }
}
