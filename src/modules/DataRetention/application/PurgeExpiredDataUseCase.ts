import {
  cutoffFor,
  resolveRetention,
  type RetentionPolicy,
} from '../domain/RetentionPolicy';
import type { RetentionRepository, RetentionRun } from '../domain/RetentionRepository';

export class PurgeExpiredDataUseCase {
  constructor(
    private readonly repository: RetentionRepository,
    private readonly overrides: Partial<RetentionPolicy> = {},
  ) {}

  public async execute(now = new Date()): Promise<RetentionRun> {
    const policy = resolveRetention(this.overrides);
    return this.repository.purge({
      contactMessages: cutoffFor(policy.contactMessageDays, now),
      unsubscribedSubscribers: cutoffFor(policy.unsubscribedSubscriberDays, now),
      orders: cutoffFor(policy.orderDays, now),
    });
  }
}
