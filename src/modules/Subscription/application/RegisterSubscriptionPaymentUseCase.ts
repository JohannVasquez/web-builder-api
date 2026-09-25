import { NotFoundError } from '@/shared/domain/NotFoundError';
import { SubscriptionRepository } from '../domain/SubscriptionRepository';

export interface RegisterPaymentInput {
  amountCents: number;
  paidAt: Date;
  paymentMethod: string;
}

export class RegisterSubscriptionPaymentUseCase {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  public async execute(tenantId: string, input: RegisterPaymentInput): Promise<void> {
    const subscription = await this.subscriptions.findByTenantId(tenantId);
    
    if (!subscription) {
      throw new NotFoundError('Este cliente no tiene una suscripción configurada.');
    }

    await this.subscriptions.savePayment(subscription.id, input);
  }
}
