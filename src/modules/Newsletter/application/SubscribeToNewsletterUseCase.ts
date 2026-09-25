import { createHash } from 'node:crypto';
import type { NewsletterRepository } from '../domain/NewsletterRepository';
import type { ConsentRepository } from '@/modules/Consent/domain/ConsentRepository';
import { LEGAL_TEMPLATES_VERSION } from '@/modules/LegalPages/domain/legalTemplates';

export class SubscribeToNewsletterUseCase {
  constructor(
    private readonly repository: NewsletterRepository,
    private readonly consentRepository: ConsentRepository,
  ) {}

  public async execute(tenantId: string, email: string): Promise<void> {
    await this.repository.subscribe(tenantId, email);

    const subject = createHash('sha256').update(email.toLowerCase()).digest('hex');
    await this.consentRepository.record(
      tenantId,
      {
        subject,
        source: 'newsletter',
        purposes: [],
        textVersion: LEGAL_TEMPLATES_VERSION,
      },
      { ipHash: null, userAgent: null },
    );
  }
}
