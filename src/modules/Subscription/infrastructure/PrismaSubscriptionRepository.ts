import { Prisma, PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { Subscription, SubscriptionPaymentPrimitives } from '../domain/Subscription';
import { SubscriptionRepository } from '../domain/SubscriptionRepository';

type RawSubscription = Prisma.SubscriptionGetPayload<{ include: { payments: true } }>;

export class PrismaSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async save(
    tenantId: string,
    subscription: { planName: string; priceCents: number; startsAt: Date; billingDay: number },
  ): Promise<Subscription> {
    const raw = await this.prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        planName: subscription.planName,
        priceCents: subscription.priceCents,
        startsAt: subscription.startsAt,
        billingDay: subscription.billingDay,
      },
      update: {
        planName: subscription.planName,
        priceCents: subscription.priceCents,
        startsAt: subscription.startsAt,
        billingDay: subscription.billingDay,
      },
      include: { payments: { orderBy: { paidAt: 'asc' } } },
    });

    return this.mapToDomain(raw);
  }

  public async findByTenantId(tenantId: string): Promise<Subscription | null> {
    const raw = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { payments: { orderBy: { paidAt: 'asc' } } },
    });

    if (!raw) return null;

    return this.mapToDomain(raw);
  }

  public async findAll(): Promise<Subscription[]> {
    const raw = await this.prisma.subscription.findMany({
      include: { payments: { orderBy: { paidAt: 'asc' } } },
    });

    return raw.map((r) => this.mapToDomain(r));
  }

  public async savePayment(
    subscriptionId: string,
    payment: { amountCents: number; paidAt: Date; paymentMethod: string },
  ): Promise<void> {
    await this.prisma.subscriptionPayment.create({
      data: {
        subscriptionId,
        amountCents: payment.amountCents,
        paidAt: payment.paidAt,
        paymentMethod: payment.paymentMethod,
      },
    });
  }

  private mapToDomain(raw: RawSubscription): Subscription {
    const payments: SubscriptionPaymentPrimitives[] = (raw.payments ?? []).map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      paidAt: p.paidAt.toISOString(),
      paymentMethod: p.paymentMethod,
    }));

    return new Subscription(
      raw.id,
      raw.tenantId,
      raw.planName,
      raw.priceCents,
      raw.startsAt,
      raw.billingDay,
      payments,
    );
  }
}

