import type { NewOrder, Order, OrderStatus } from './Order';

export interface OrderQuery {
  readonly status?: OrderStatus;
  readonly from?: Date;
  readonly to?: Date;
  readonly page: number;
  readonly perPage: number;
}

export interface SalesReport {
  readonly orders: number;
  readonly totalCents: number;
  readonly averageCents: number;
  readonly byDay: readonly { date: string; orders: number; totalCents: number }[];
  readonly topProducts: readonly {
    productId: number | null;
    name: string;
    units: number;
    totalCents: number;
  }[];
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class OrderRepository {
  public abstract create(tenantId: number, order: NewOrder): Promise<Order>;
  public abstract findById(tenantId: number, id: number): Promise<Order | null>;
  public abstract findByNumber(tenantId: number, number: string): Promise<Order | null>;
  public abstract findByPaymentReference(
    tenantId: number,
    reference: string,
  ): Promise<Order | null>;
  public abstract list(
    tenantId: number,
    query: OrderQuery,
  ): Promise<{ orders: Order[]; total: number }>;
  public abstract setStatus(
    tenantId: number,
    id: number,
    status: OrderStatus,
  ): Promise<Order>;
  public abstract markPaid(
    tenantId: number,
    id: number,
    reference: string,
  ): Promise<Order>;
  public abstract setPaymentReference(
    tenantId: number,
    id: number,
    reference: string,
  ): Promise<void>;
  // Descuenta el stock de los productos del pedido. Los que no controlan stock se saltan.
  public abstract discountStock(tenantId: number, orderId: number): Promise<void>;
  public abstract restoreStock(tenantId: number, orderId: number): Promise<void>;
  public abstract salesReport(
    tenantId: number,
    from: Date,
    to: Date,
  ): Promise<SalesReport>;
}
