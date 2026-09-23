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
    productId: string | null;
    name: string;
    units: number;
    totalCents: number;
  }[];
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class OrderRepository {
  /**
   * Deja constancia del correo de confirmación: con fecha si salió, con motivo si falló. Sin
   * esto, un correo perdido no se distingue de uno entregado y nadie puede reintentarlo.
   */
  public abstract markConfirmationEmailed(
    orderId: string,
    emailedAt: Date | null,
    error: string | null,
  ): Promise<void>;

  public abstract create(tenantId: string, order: NewOrder): Promise<Order>;
  public abstract findById(tenantId: string, id: string): Promise<Order | null>;
  public abstract findByNumber(tenantId: string, number: string): Promise<Order | null>;
  public abstract findByPaymentReference(
    tenantId: string,
    reference: string,
  ): Promise<Order | null>;
  public abstract list(
    tenantId: string,
    query: OrderQuery,
  ): Promise<{ orders: Order[]; total: number }>;
  public abstract setStatus(
    tenantId: string,
    id: string,
    status: OrderStatus,
  ): Promise<Order>;
  public abstract markPaid(
    tenantId: string,
    id: string,
    reference: string,
  ): Promise<Order>;
  public abstract setPaymentReference(
    tenantId: string,
    id: string,
    reference: string,
  ): Promise<void>;
  // Descuenta el stock de los productos del pedido. Los que no controlan stock se saltan.
  public abstract discountStock(tenantId: string, orderId: string): Promise<void>;
  public abstract restoreStock(tenantId: string, orderId: string): Promise<void>;
  // `timeZone` decide a qué día pertenece cada venta: el de la tienda, no UTC.
  public abstract salesReport(
    tenantId: string,
    from: Date,
    to: Date,
    timeZone?: string,
  ): Promise<SalesReport>;
}
