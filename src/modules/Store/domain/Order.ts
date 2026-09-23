import { z } from 'zod';
import type { PricedLine } from './cartPricing';
import { idSchema } from '@/shared/domain/identifier';
import { isValidRut, normalizeRut } from './rut';
import type { SellerIdentity } from './StoreSettings';

export const ORDER_STATUSES = [
  'pending',
  'paid',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  pending: 'Pendiente de pago',
  paid: 'Pagado',
  preparing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

// Un pedido avanza; no retrocede. Cancelar se puede hasta antes de entregar, y un pedido
// entregado o cancelado ya no cambia: su historia quedó cerrada.
const NEXT_STATUSES: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending: ['paid', 'cancelled'],
  paid: ['preparing', 'shipped', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean =>
  NEXT_STATUSES[from].includes(to);

export type DeliveryMethod = 'shipping' | 'pickup';

export interface OrderItemPrimitives {
  readonly productId: string | null;
  readonly name: string;
  readonly variant: Readonly<Record<string, string>>;
  readonly unitPriceCents: number;
  readonly quantity: number;
  readonly totalCents: number;
}

export interface OrderPrimitives {
  readonly id: string;
  readonly number: string;
  readonly status: OrderStatus;
  readonly statusLabel: string;
  readonly customer: {
    readonly name: string;
    readonly email: string;
    readonly phone: string;
  };
  readonly delivery: {
    readonly method: DeliveryMethod;
    readonly shippingName: string | null;
    readonly addressLine: string | null;
    readonly addressCity: string | null;
    readonly addressRegion: string | null;
    readonly addressNotes: string | null;
  };
  readonly items: readonly OrderItemPrimitives[];
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly shippingCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
  readonly currency: string;
  readonly couponCode: string | null;
  readonly paymentProvider: string | null;
  readonly paidAt: string | null;
  readonly createdAt: string;
  // Constancia de los términos de compra aceptados; nula si la tienda no los exigía.
  readonly termsAcceptedAt: string | null;
  readonly termsVersion: string | null;
  // Quién vendió, tal como estaba al confirmar. Copia y no referencia: si el cliente cambia
  // su razón social mañana, este pedido tiene que seguir diciendo con quién se contrató.
  readonly seller: SellerIdentity | null;
}

export interface OrderCustomer {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  // Solo cuando pidió factura; una boleta no lo exige.
  readonly taxId?: string | null;
}

export interface OrderDelivery {
  readonly method: DeliveryMethod;
  readonly shippingCode: string | null;
  readonly shippingName: string | null;
  readonly addressLine: string | null;
  readonly addressCity: string | null;
  readonly addressRegion: string | null;
  readonly addressNotes: string | null;
}

export class Order {
  constructor(
    public readonly id: string,
    public readonly number: string,
    public readonly status: OrderStatus,
    public readonly customer: OrderCustomer,
    public readonly delivery: OrderDelivery,
    public readonly items: readonly OrderItemPrimitives[],
    public readonly subtotalCents: number,
    public readonly discountCents: number,
    public readonly shippingCents: number,
    public readonly taxCents: number,
    public readonly totalCents: number,
    public readonly currency: string,
    public readonly couponCode: string | null,
    public readonly paymentProvider: string | null,
    public readonly paymentReference: string | null,
    public readonly paidAt: Date | null,
    public readonly createdAt: Date,
    public readonly termsAcceptedAt: Date | null = null,
    public readonly termsVersion: string | null = null,
    public readonly seller: SellerIdentity | null = null,
  ) {}

  public toPrimitives(): OrderPrimitives {
    return {
      id: this.id,
      number: this.number,
      status: this.status,
      statusLabel: ORDER_STATUS_LABELS[this.status],
      customer: this.customer,
      delivery: {
        method: this.delivery.method,
        shippingName: this.delivery.shippingName,
        addressLine: this.delivery.addressLine,
        addressCity: this.delivery.addressCity,
        addressRegion: this.delivery.addressRegion,
        addressNotes: this.delivery.addressNotes,
      },
      items: this.items,
      subtotalCents: this.subtotalCents,
      discountCents: this.discountCents,
      shippingCents: this.shippingCents,
      taxCents: this.taxCents,
      totalCents: this.totalCents,
      currency: this.currency,
      couponCode: this.couponCode,
      paymentProvider: this.paymentProvider,
      paidAt: this.paidAt?.toISOString() ?? null,
      createdAt: this.createdAt.toISOString(),
      termsAcceptedAt: this.termsAcceptedAt?.toISOString() ?? null,
      termsVersion: this.termsVersion,
      seller: this.seller,
    };
  }
}

export interface NewOrder {
  readonly customer: OrderCustomer;
  readonly delivery: OrderDelivery;
  readonly lines: readonly PricedLine[];
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly shippingCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
  readonly currency: string;
  readonly couponCode: string | null;
  readonly paymentProvider: string | null;
  readonly termsAcceptedAt: Date | null;
  readonly termsVersion: string | null;
  readonly seller: SellerIdentity | null;
}

// Correlativo por cliente y de largo fijo: "0001". Lo ve el comprador, así que no
// puede ser el id de la base (delataría cuántos pedidos lleva la tienda).
export const nextOrderNumber = (lastNumber: string | null): string => {
  const previous = lastNumber === null ? 0 : Number.parseInt(lastNumber, 10);
  const next = Number.isNaN(previous) ? 1 : previous + 1;
  return String(next).padStart(4, '0');
};

export const CartItemSchema = z.strictObject({
  productId: idSchema,
  quantity: z.number().int().min(1).max(99),
  variant: z.record(z.string(), z.string()).default({}),
});

export const CartSchema = z.strictObject({
  items: z.array(CartItemSchema).min(1, 'El carrito está vacío').max(50),
  couponCode: z.string().trim().max(40).nullable().default(null),
  shippingCode: z.string().trim().max(40).nullable().default(null),
});

export const CheckoutSchema = CartSchema.extend({
  customer: z.strictObject({
    name: z.string().trim().min(2, 'Necesitamos tu nombre').max(160),
    email: z.email('Necesitamos un correo válido para enviarte la confirmación'),
    phone: z.string().trim().min(6, 'Necesitamos un teléfono de contacto').max(40),
    // El RUT solo hace falta para emitir factura; una boleta no lo pide.
    taxId: z
      .string()
      .trim()
      .transform((value) => (value === '' ? null : normalizeRut(value)))
      .refine((value) => value === null || isValidRut(value), 'El RUT no es válido')
      .nullable()
      .default(null),
  }),
  // Pedir factura obliga a identificarse: sin RUT el documento no se puede emitir.
  wantsInvoice: z.boolean().default(false),
  delivery: z.strictObject({
    method: z.enum(['shipping', 'pickup']),
    addressLine: z.string().trim().max(255).nullable().default(null),
    addressCity: z.string().trim().max(120).nullable().default(null),
    addressRegion: z.string().trim().max(120).nullable().default(null),
    addressNotes: z.string().trim().max(500).nullable().default(null),
  }),
  returnUrl: z.url().optional(),
  // Solo cuenta si la tienda exige términos; ahí es obligatorio que venga en `true`.
  acceptedTerms: z.boolean().default(false),
}).refine((value) => !value.wantsInvoice || value.customer.taxId !== null, {
  message: 'Para emitir factura necesitamos tu RUT',
  path: ['customer', 'taxId'],
});

export type CartInput = z.infer<typeof CartSchema>;
export type CheckoutInput = z.infer<typeof CheckoutSchema>;
