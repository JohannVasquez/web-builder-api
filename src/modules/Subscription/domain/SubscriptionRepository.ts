import { Subscription } from './Subscription';

export abstract class SubscriptionRepository {
  public abstract save(tenantId: string, subscription: {
    planName: string;
    priceCents: number;
    startsAt: Date;
    billingDay: number;
  }): Promise<Subscription>;
  
  public abstract findByTenantId(tenantId: string): Promise<Subscription | null>;
  
  public abstract findAll(): Promise<Subscription[]>;
  
  public abstract savePayment(subscriptionId: string, payment: {
    amountCents: number;
    paidAt: Date;
    paymentMethod: string;
  }): Promise<void>;
}
