import type { SubscriptionStatus } from '../domain/Subscription';
import { SubscriptionRepository } from '../domain/SubscriptionRepository';

export interface SubscriptionOverviewRow {
  tenantId: string;
  planName: string;
  priceCents: number;
  status: SubscriptionStatus;
  mrrCents: number;
}

export class GetSubscriptionsOverviewUseCase {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  public async execute(now = new Date()): Promise<{
    rows: SubscriptionOverviewRow[];
    totalMrrCents: number;
  }> {
    const all = await this.subscriptions.findAll();

    let totalMrrCents = 0;
    const rows = all.map((sub) => {
      const status = sub.getStatus(now);
      const mrrCents = status !== 'atrasado' ? sub.priceCents : 0;
      totalMrrCents += mrrCents;

      return {
        tenantId: sub.tenantId,
        planName: sub.planName,
        priceCents: sub.priceCents,
        status,
        mrrCents,
      };
    });

    return { rows, totalMrrCents };
  }
}
