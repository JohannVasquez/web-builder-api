import { BadRequestError } from '@/shared/domain/BadRequestError';
import { NotFoundError } from '@/shared/domain/NotFoundError';
import {
  canTransition,
  ORDER_STATUS_LABELS,
  type Order,
  type OrderStatus,
} from '../domain/Order';
import type { CouponRepository } from '../domain/CouponRepository';
import type { OrderMailContext, OrderMailer } from '../domain/OrderMailer';
import type { OrderQuery, OrderRepository, SalesReport } from '../domain/OrderRepository';
import type { StoreSettingsRepository } from '../domain/StoreSettingsRepository';

export class ManageOrdersUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly couponRepository: CouponRepository,
    private readonly storeSettingsRepository: StoreSettingsRepository,
    private readonly mailer: OrderMailer,
  ) {}

  public async list(
    tenantId: string,
    query: OrderQuery,
  ): Promise<{ orders: Order[]; total: number }> {
    return this.orderRepository.list(tenantId, query);
  }

  public async find(tenantId: string, id: string): Promise<Order> {
    const order = await this.orderRepository.findById(tenantId, id);
    if (order === null) {
      throw new NotFoundError('Ese pedido no existe.');
    }
    return order;
  }

  public async changeStatus(
    tenantId: string,
    id: string,
    status: OrderStatus,
    storeName: string,
  ): Promise<Order> {
    const order = await this.find(tenantId, id);
    if (order.status === status) {
      return order;
    }
    if (!canTransition(order.status, status)) {
      throw new BadRequestError(
        `Un pedido "${ORDER_STATUS_LABELS[order.status]}" no puede pasar a "${ORDER_STATUS_LABELS[status]}".`,
      );
    }

    // Marcar pagado a mano (transferencia) tiene que hacer lo mismo que hace el aviso
    // del proveedor: descontar stock, gastar el cupón y avisar por correo.
    if (status === 'paid') {
      const paid = await this.orderRepository.markPaid(tenantId, id, order.number);
      await this.orderRepository.discountStock(tenantId, id);
      if (order.couponCode !== null) {
        await this.couponRepository.registerUse(tenantId, order.couponCode);
      }
      await this.notifyPaid(tenantId, paid, storeName);
      return paid;
    }

    // Cancelar un pedido ya pagado devuelve al stock lo que se había reservado.
    if (status === 'cancelled' && order.paidAt !== null) {
      await this.orderRepository.restoreStock(tenantId, id);
    }

    return this.orderRepository.setStatus(tenantId, id, status);
  }

  public async report(
    tenantId: string,
    from: Date,
    to: Date,
    timeZone?: string,
  ): Promise<SalesReport> {
    return this.orderRepository.salesReport(tenantId, from, to, timeZone);
  }

  private async notifyPaid(
    tenantId: string,
    order: Order,
    storeName: string,
  ): Promise<void> {
    const settings = await this.storeSettingsRepository.find(tenantId);
    const context: OrderMailContext = {
      storeName,
      seller: settings.seller,
      termsUrl: settings.termsPageSlug === null ? null : `/${settings.termsPageSlug}`,
      termsVersion: order.termsVersion,
    };

    // El fallo queda registrado en el pedido en vez de perderse: la confirmación escrita es
    // una obligación, así que tiene que poder reintentarse.
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

    if (settings.notificationEmail !== null) {
      await this.mailer
        .sendOwnerNotice(order, context, settings.notificationEmail)
        .catch(() => undefined);
    }
  }
}
