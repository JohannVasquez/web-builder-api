import { hashIp } from '@/modules/Consent/domain/ipHash';
import type { DemoRepository } from '../domain/DemoRepository';
import { trimUserAgent } from '../domain/DemoVisit';

export interface DemoVisitOrigin {
  readonly pageSlug: string;
  readonly ip: string | undefined;
  readonly userAgent: string | undefined;
}

export class RecordDemoVisitUseCase {
  constructor(
    private readonly demoRepository: DemoRepository,
    // La misma sal y el mismo criterio que el consentimiento: sin sal no se guarda huella.
    private readonly ipSalt: string,
  ) {}

  // Nunca lanza: la visita es un dato para la agencia, no una condición para servir la página.
  public async execute(
    demoId: string,
    origin: DemoVisitOrigin,
    now: Date = new Date(),
  ): Promise<void> {
    try {
      await this.demoRepository.recordVisit(demoId, {
        pageSlug: origin.pageSlug,
        ipHash: hashIp(origin.ip, this.ipSalt),
        userAgent: trimUserAgent(origin.userAgent),
        visitedAt: now,
      });
    } catch (error) {
      console.error('[Demo] No se pudo registrar la visita:', error);
    }
  }
}
