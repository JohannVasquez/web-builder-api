import type { ConsumerClaim } from './ConsumerClaim';

export abstract class ConsumerClaimMailer {
  public abstract notifySeller(claim: ConsumerClaim, sellerEmail: string): Promise<void>;
  public abstract sendAcknowledgmentToBuyer(claim: ConsumerClaim, storeName: string): Promise<void>;
}
