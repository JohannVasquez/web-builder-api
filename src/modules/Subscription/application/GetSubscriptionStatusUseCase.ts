import { NotFoundError } from '@/shared/domain/NotFoundError';
import { SubscriptionStatus } from '../domain/Subscription';
import { SubscriptionRepository } from '../domain/SubscriptionRepository';

export class GetSubscriptionStatusUseCase {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  public async execute(tenantId: string, now = new Date()): Promise<{
    planName: string;
    priceCents: number;
    status: SubscriptionStatus;
  }> {
    const subscription = await this.subscriptions.findByTenantId(tenantId);
    
    if (!subscription) {
      throw new NotFoundError('Este cliente no tiene una suscripción configurada.');
    }

    return {
      planName: subscription.planName,
      priceCents: subscription.priceCents,
      status: subscription.getStatus(now),
    };
  }
}
