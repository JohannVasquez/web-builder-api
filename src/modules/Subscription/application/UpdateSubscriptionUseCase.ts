import { Subscription } from '../domain/Subscription';
import { SubscriptionRepository } from '../domain/SubscriptionRepository';

export interface UpdateSubscriptionInput {
  planName: string;
  priceCents: number;
  startsAt: Date;
  billingDay: number;
}

export class UpdateSubscriptionUseCase {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  public async execute(tenantId: string, input: UpdateSubscriptionInput): Promise<Subscription> {
    return this.subscriptions.save(tenantId, input);
  }
}
