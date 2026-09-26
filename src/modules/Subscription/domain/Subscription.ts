import { z } from 'zod';

export const SUBSCRIPTION_STATUSES = ['al_dia', 'por_vencer', 'atrasado'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SubscriptionPaymentSchema = z.strictObject({
  amountCents: z.number().int().positive(),
  paidAt: z.string().datetime(),
  paymentMethod: z.string().trim().min(1).max(50),
});

export const SubscriptionSchema = z.strictObject({
  planName: z.string().trim().min(1).max(100),
  priceCents: z.number().int().nonnegative(),
  startsAt: z.string().datetime(),
  billingDay: z.number().int().min(1).max(31),
});

export interface SubscriptionPaymentPrimitives {
  readonly id: string;
  readonly amountCents: number;
  readonly paidAt: string;
  readonly paymentMethod: string;
}

export interface SubscriptionPrimitives {
  readonly id: string;
  readonly tenantId: string;
  readonly planName: string;
  readonly priceCents: number;
  readonly startsAt: string;
  readonly billingDay: number;
  readonly payments: SubscriptionPaymentPrimitives[];
}

export class Subscription {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly planName: string,
    public readonly priceCents: number,
    public readonly startsAt: Date,
    public readonly billingDay: number,
    public readonly payments: SubscriptionPaymentPrimitives[],
  ) {}

  public getStatus(now: Date = new Date()): SubscriptionStatus {
    if (now < this.startsAt) return 'al_dia';

    const currentDue = new Date(this.startsAt);
    currentDue.setDate(this.billingDay);
    if (currentDue < this.startsAt) {
      currentDue.setMonth(currentDue.getMonth() + 1);
    }

    let expectedPayments = 0;
    while (currentDue <= now) {
      expectedPayments++;
      currentDue.setMonth(currentDue.getMonth() + 1);
    }

    const actualPayments = this.payments.length;

    if (actualPayments < expectedPayments) {
      return 'atrasado';
    }

    const daysToNext = (currentDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysToNext <= 5 && daysToNext >= 0) {
      return 'por_vencer';
    }

    return 'al_dia';
  }

  public get formattedPrice(): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(this.priceCents);
  }

  public toPrimitives(): SubscriptionPrimitives {
    return {
      id: this.id,
      tenantId: this.tenantId,
      planName: this.planName,
      priceCents: this.priceCents,
      startsAt: this.startsAt.toISOString(),
      billingDay: this.billingDay,
      payments: this.payments,
    };
  }
}
