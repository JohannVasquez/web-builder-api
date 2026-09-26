import type { OrderRepository } from '../domain/OrderRepository';
import type { OrderMailer } from '../domain/OrderMailer';
import type { StoreSettingsRepository } from '../domain/StoreSettingsRepository';

export class RetryOrderConfirmationUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly mailer: OrderMailer,
    private readonly storeSettingsRepository: StoreSettingsRepository,
  ) {}

  public async execute(tenantId: string, storeName: string): Promise<number> {
    const orders = await this.orderRepository.findPendingConfirmationEmailed(tenantId);
    let retried = 0;

    if (orders.length === 0) return 0;

    const settings = await this.storeSettingsRepository.find(tenantId);
    
    for (const order of orders) {
      try {
        await this.mailer.sendBuyerConfirmation(order, {
          // Usamos el nombre del tenant (storeName) inyectado desde la capa de presentación porque StoreSettings no lo guarda duplicado.
          storeName,
          seller: settings.seller,
          termsUrl: settings.termsPageSlug ? `/${settings.termsPageSlug}` : null,
          termsVersion: order.termsVersion,
        });
        await this.orderRepository.markConfirmationEmailed(order.id, new Date(), null);
        retried++;
      } catch (error) {
        await this.orderRepository.markConfirmationEmailed(
          order.id,
          null,
          error instanceof Error ? error.message : 'Error desconocido',
        );
      }
    }

    return retried;
  }
}
