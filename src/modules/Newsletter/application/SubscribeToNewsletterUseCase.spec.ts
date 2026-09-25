import { createHash } from 'node:crypto';
import { SubscribeToNewsletterUseCase } from './SubscribeToNewsletterUseCase';
import { LEGAL_TEMPLATES_VERSION } from '@/modules/LegalPages/domain/legalTemplates';

import type { NewsletterRepository } from '../domain/NewsletterRepository';
import type { ConsentRepository } from '@/modules/Consent/domain/ConsentRepository';

describe('SubscribeToNewsletterUseCase', () => {
  it('guarda el suscriptor y registra el consentimiento', async () => {
    const repository = { subscribe: jest.fn() } as unknown as NewsletterRepository;
    const consentRepository = { record: jest.fn() } as unknown as ConsentRepository;

    const useCase = new SubscribeToNewsletterUseCase(repository, consentRepository);
    await useCase.execute('tenant1', 'test@test.com');

    expect(repository.subscribe).toHaveBeenCalledWith('tenant1', 'test@test.com');
    expect(consentRepository.record).toHaveBeenCalledWith(
      'tenant1',
      {
        subject: createHash('sha256').update('test@test.com').digest('hex'),
        source: 'newsletter',
        purposes: [],
        textVersion: LEGAL_TEMPLATES_VERSION,
      },
      { ipHash: null, userAgent: null }
    );
  });
});
