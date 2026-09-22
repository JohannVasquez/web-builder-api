import type { ConsentRecord } from '../domain/Consent';
import type { ConsentRepository } from '../domain/ConsentRepository';

export interface CurrentConsent {
  readonly consent: ConsentRecord | null;
  // Falso cuando el texto legal cambió desde que la persona aceptó: hay que volver a
  // preguntar, porque nadie puede haber aceptado un texto que no leyó.
  readonly isCurrent: boolean;
}

export class GetCurrentConsentUseCase {
  constructor(private readonly repository: ConsentRepository) {}

  public async execute(
    tenantId: string,
    subject: string,
    textVersion: string,
  ): Promise<CurrentConsent> {
    const consent = await this.repository.findLatest(tenantId, subject);
    return {
      consent,
      isCurrent: consent !== null && consent.appliesTo(textVersion),
    };
  }
}
