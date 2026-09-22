import { NewsletterRepository } from '../domain/NewsletterRepository';

export class SubscribeToNewsletterUseCase {
  constructor(private readonly repository: NewsletterRepository) {}

  public async execute(tenantId: string, email: string): Promise<void> {
    await this.repository.subscribe(tenantId, email);
  }
}
