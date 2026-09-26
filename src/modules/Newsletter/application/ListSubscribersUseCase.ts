import { NewsletterRepository } from '../domain/NewsletterRepository';
import type { NewsletterSubscriber } from '../domain/NewsletterSchema';

export class ListSubscribersUseCase {
  constructor(private readonly repository: NewsletterRepository) {}

  public async execute(
    tenantId: string,
    limit: number,
    offset: number,
  ): Promise<{ subscribers: NewsletterSubscriber[]; total: number }> {
    return this.repository.list(tenantId, limit, offset);
  }
}
