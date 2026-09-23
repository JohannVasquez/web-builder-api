import { NotFoundError } from '@/shared/domain/NotFoundError';
import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import {
  nextOrderNumber,
  Order,
  ORDER_STATUSES,
  type NewOrder,
  type OrderItemPrimitives,
  type OrderStatus,
} from '../domain/Order';
import type { OrderQuery, OrderRepository, SalesReport } from '../domain/OrderRepository';
import { SellerIdentitySchema, type SellerIdentity } from '../domain/StoreSettings';
import { DEFAULT_TIME_ZONE, localDayKey } from '../domain/localDay';

interface OrderItemRecord {
  readonly productId: string | null;
  readonly name: string;
  readonly variant: unknown;
  readonly unitPriceCents: number;
  readonly quantity: number;
  readonly totalCents: number;
}

interface OrderRecord {
  readonly id: string;
  readonly number: string;
  readonly status: string;
  readonly customerName: string;
  readonly customerEmail: string;
  readonly customerPhone: string;
  readonly customerTaxId?: string | null;
  readonly deliveryMethod: string;
  readonly addressLine: string | null;
  readonly addressCity: string | null;
  readonly addressRegion: string | null;
  readonly addressNotes: string | null;
  readonly shippingCode: string | null;
  readonly shippingName: string | null;
  readonly shippingCents: number;
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
  readonly currency: string;
  readonly couponCode: string | null;
  readonly paymentProvider: string | null;
  readonly paymentReference: string | null;
  readonly paidAt: Date | null;
  readonly createdAt: Date;
  readonly termsAcceptedAt: Date | null;
  readonly termsVersion: string | null;
  readonly seller?: unknown;
  readonly items: readonly OrderItemRecord[];
}

const asJsonColumn = (value: unknown): object => value as object;

// La copia del vendedor se guarda como JSON suelto: si viniera rota, el pedido se sigue
// leyendo sin ella en vez de caerse entero.
const toSeller = (value: unknown): SellerIdentity | null => {
  const parsed = SellerIdentitySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const toVariant = (value: unknown): Record<string, string> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
};

const toStatus = (value: string): OrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(value)
    ? (value as OrderStatus)
    : 'pending';

export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async markConfirmationEmailed(
    orderId: string,
    emailedAt: Date | null,
    error: string | null,
  ): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: { confirmationEmailedAt: emailedAt, confirmationEmailError: error },
    });
  }

  public async create(tenantId: string, order: NewOrder): Promise<Order> {
    // Todo dentro de una transacción: dos compras a la vez no pueden quedarse con el
    // mismo número de pedido.
    const record = await this.prisma.$transaction(async (tx) => {
      const last = await tx.order.findFirst({
        where: { tenantId },
        orderBy: { number: 'desc' },
        select: { number: true },
      });

      return tx.order.create({
        data: {
          tenantId,
          number: nextOrderNumber(last?.number ?? null),
          status: 'pending',
          customerName: order.customer.name,
          customerEmail: order.customer.email,
          customerPhone: order.customer.phone,
          customerTaxId: order.customer.taxId ?? null,
          deliveryMethod: order.delivery.method,
          addressLine: order.delivery.addressLine,
          addressCity: order.delivery.addressCity,
          addressRegion: order.delivery.addressRegion,
          addressNotes: order.delivery.addressNotes,
          shippingCode: order.delivery.shippingCode,
          shippingName: order.delivery.shippingName,
          shippingCents: order.shippingCents,
          subtotalCents: order.subtotalCents,
          discountCents: order.discountCents,
          taxCents: order.taxCents,
          totalCents: order.totalCents,
          currency: order.currency,
          couponCode: order.couponCode,
          paymentProvider: order.paymentProvider,
          termsAcceptedAt: order.termsAcceptedAt,
          termsVersion: order.termsVersion,
          seller: order.seller === null ? undefined : asJsonColumn(order.seller),
          items: {
            create: order.lines.map((line) => ({
              productId: line.productId,
              name: line.name,
              variant: asJsonColumn(line.variant),
              unitPriceCents: line.unitPriceCents,
              quantity: line.quantity,
              totalCents: line.totalCents,
            })),
          },
        },
        include: { items: true },
      });
    });

    return this.toDomain(record);
  }

  public async findById(tenantId: string, id: string): Promise<Order | null> {
    const record = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
    return record === null ? null : this.toDomain(record);
  }

  public async findByNumber(tenantId: string, number: string): Promise<Order | null> {
    const record = await this.prisma.order.findFirst({
      where: { tenantId, number },
      include: { items: true },
    });
    return record === null ? null : this.toDomain(record);
  }

  public async findByPaymentReference(
    tenantId: string,
    reference: string,
  ): Promise<Order | null> {
    const record = await this.prisma.order.findFirst({
      where: { tenantId, paymentReference: reference },
      include: { items: true },
    });
    return record === null ? null : this.toDomain(record);
  }

  public async list(
    tenantId: string,
    query: OrderQuery,
  ): Promise<{ orders: Order[]; total: number }> {
    const where = {
      tenantId,
      ...(query.status === undefined ? {} : { status: query.status }),
      ...(query.from === undefined && query.to === undefined
        ? {}
        : {
            createdAt: {
              ...(query.from === undefined ? {} : { gte: query.from }),
              ...(query.to === undefined ? {} : { lte: query.to }),
            },
          }),
    };

    const [records, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders: records.map((record) => this.toDomain(record)), total };
  }

  public async setStatus(
    tenantId: string,
    id: string,
    status: OrderStatus,
  ): Promise<Order> {
    await this.requireOwnership(tenantId, id);
    const record = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });
    return this.toDomain(record);
  }

  public async markPaid(tenantId: string, id: string, reference: string): Promise<Order> {
    await this.requireOwnership(tenantId, id);
    const record = await this.prisma.order.update({
      where: { id },
      data: { status: 'paid', paidAt: new Date(), paymentReference: reference },
      include: { items: true },
    });
    return this.toDomain(record);
  }

  public async setPaymentReference(
    tenantId: string,
    id: string,
    reference: string,
  ): Promise<void> {
    await this.prisma.order.updateMany({
      where: { id, tenantId },
      data: { paymentReference: reference },
    });
  }

  public async discountStock(tenantId: string, orderId: string): Promise<void> {
    await this.moveStock(tenantId, orderId, -1);
  }

  public async restoreStock(tenantId: string, orderId: string): Promise<void> {
    await this.moveStock(tenantId, orderId, 1);
  }

  public async salesReport(
    tenantId: string,
    from: Date,
    to: Date,
    timeZone: string = DEFAULT_TIME_ZONE,
  ): Promise<SalesReport> {
    // Solo los pedidos que se pagaron: un carrito abandonado no es una venta.
    const records = await this.prisma.order.findMany({
      where: {
        tenantId,
        paidAt: { not: null, gte: from, lte: to },
        status: { not: 'cancelled' },
      },
      include: { items: true },
    });

    const byDay = new Map<string, { orders: number; totalCents: number }>();
    const byProduct = new Map<
      string,
      { productId: string | null; name: string; units: number; totalCents: number }
    >();
    let totalCents = 0;

    for (const record of records) {
      totalCents += record.totalCents;
      const key = localDayKey(record.paidAt ?? record.createdAt, timeZone);
      const day = byDay.get(key) ?? { orders: 0, totalCents: 0 };
      byDay.set(key, {
        orders: day.orders + 1,
        totalCents: day.totalCents + record.totalCents,
      });

      for (const item of record.items) {
        const productKey =
          item.productId === null ? `n:${item.name}` : `p:${item.productId}`;
        const product = byProduct.get(productKey) ?? {
          productId: item.productId,
          name: item.name,
          units: 0,
          totalCents: 0,
        };
        byProduct.set(productKey, {
          ...product,
          units: product.units + item.quantity,
          totalCents: product.totalCents + item.totalCents,
        });
      }
    }

    return {
      orders: records.length,
      totalCents,
      averageCents: records.length === 0 ? 0 : Math.round(totalCents / records.length),
      byDay: [...byDay.entries()]
        .map(([date, value]) => ({ date, ...value }))
        .sort((left, right) => left.date.localeCompare(right.date)),
      topProducts: [...byProduct.values()]
        .sort((left, right) => right.units - left.units)
        .slice(0, 10),
    };
  }

  // Los productos sin control de stock (`null`) se saltan: no hay nada que mover.
  private async moveStock(
    tenantId: string,
    orderId: string,
    sign: 1 | -1,
  ): Promise<void> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true },
    });
    if (order === null) {
      return;
    }

    for (const item of order.items) {
      if (item.productId === null) {
        continue;
      }
      await this.prisma.product.updateMany({
        where: { id: item.productId, tenantId, stock: { not: null } },
        data: { stock: { increment: sign * item.quantity } },
      });
    }

    // El stock nunca queda negativo aunque dos compras hayan corrido a la vez.
    await this.prisma.product.updateMany({
      where: { tenantId, stock: { lt: 0 } },
      data: { stock: 0 },
    });
  }

  private async requireOwnership(tenantId: string, id: string): Promise<void> {
    const found = await this.prisma.order.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (found === null) {
      throw new NotFoundError('Ese pedido no existe.');
    }
  }

  private toDomain(record: OrderRecord): Order {
    const items: OrderItemPrimitives[] = record.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      variant: toVariant(item.variant),
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      totalCents: item.totalCents,
    }));

    return new Order(
      record.id,
      record.number,
      toStatus(record.status),
      {
        name: record.customerName,
        email: record.customerEmail,
        phone: record.customerPhone,
        taxId: record.customerTaxId ?? null,
      },
      {
        method: record.deliveryMethod === 'pickup' ? 'pickup' : 'shipping',
        shippingCode: record.shippingCode,
        shippingName: record.shippingName,
        addressLine: record.addressLine,
        addressCity: record.addressCity,
        addressRegion: record.addressRegion,
        addressNotes: record.addressNotes,
      },
      items,
      record.subtotalCents,
      record.discountCents,
      record.shippingCents,
      record.taxCents,
      record.totalCents,
      record.currency,
      record.couponCode,
      record.paymentProvider,
      record.paymentReference,
      record.paidAt,
      record.createdAt,
      record.termsAcceptedAt,
      record.termsVersion,
      toSeller(record.seller),
    );
  }
}
