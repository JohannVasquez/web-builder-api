import { z } from 'zod';
import { RETRACTO_DIAS } from '@/modules/Store/domain/consumerRights';

export const CLAIM_KINDS = ['retracto', 'reclamo'] as const;
export type ClaimKind = (typeof CLAIM_KINDS)[number];

export const CLAIM_STATUSES = ['pendiente', 'aceptado', 'rechazado'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

/**
 * Plazo para responder un reclamo. La normativa de consumo lo mide en días hábiles; se usan
 * cinco corridos como techo conservador, que siempre cae antes que el legal.
 */
export const RESPONSE_DAYS = 5;

export const ConsumerClaimSchema = z.strictObject({
  kind: z.enum(CLAIM_KINDS),
  // El retracto es sobre una compra concreta; un reclamo puede no tenerla.
  orderNumber: z.string().trim().max(20).nullable().default(null),
  email: z.email('Necesitamos el correo con el que compraste').max(255),
  message: z.string().trim().max(2000).default(''),
});

export type ConsumerClaimInput = z.infer<typeof ConsumerClaimSchema>;

/**
 * El retracto corre desde que se RECIBE el producto, no desde que se compra. Como la fecha de
 * entrega no se registra, se cuenta desde el pedido: es el criterio más estricto contra el
 * vendedor, que es el lado por el que conviene equivocarse.
 */
export const isWithinWithdrawalWindow = (orderCreatedAt: Date, now: Date): boolean => {
  const days = (now.getTime() - orderCreatedAt.getTime()) / (24 * 60 * 60 * 1000);
  return days <= RETRACTO_DIAS;
};

export interface ConsumerClaimPrimitives {
  readonly id: string;
  readonly kind: ClaimKind;
  readonly status: ClaimStatus;
  readonly orderNumber: string | null;
  readonly email: string;
  readonly message: string;
  readonly createdAt: string;
  readonly dueAt: string;
  readonly resolvedAt: string | null;
}

export class ConsumerClaim {
  constructor(
    public readonly id: string,
    public readonly kind: ClaimKind,
    public readonly status: ClaimStatus,
    public readonly orderNumber: string | null,
    public readonly email: string,
    public readonly message: string,
    public readonly createdAt: Date,
    public readonly resolvedAt: Date | null = null,
  ) {}

  public dueAt(): Date {
    return new Date(this.createdAt.getTime() + RESPONSE_DAYS * 24 * 60 * 60 * 1000);
  }

  public isOverdue(now = new Date()): boolean {
    return this.resolvedAt === null && now > this.dueAt();
  }

  public toPrimitives(): ConsumerClaimPrimitives {
    return {
      id: this.id,
      kind: this.kind,
      status: this.status,
      orderNumber: this.orderNumber,
      email: this.email,
      message: this.message,
      createdAt: this.createdAt.toISOString(),
      dueAt: this.dueAt().toISOString(),
      resolvedAt: this.resolvedAt?.toISOString() ?? null,
    };
  }
}
