import { hashIp } from '../domain/ipHash';
import type { ConsentInput, ConsentRecord } from '../domain/Consent';
import type { ConsentRepository } from '../domain/ConsentRepository';

export interface RequestOrigin {
  readonly ip: string | undefined;
  readonly userAgent: string | undefined;
}

export class RecordConsentUseCase {
  constructor(
    private readonly repository: ConsentRepository,
    // Si no hay sal configurada no se guarda huella alguna: mejor sin dato que con uno
    // reversible (ver `hashIp`).
    private readonly ipSalt: string,
  ) {}

  public async execute(
    tenantId: string,
    input: ConsentInput,
    origin: RequestOrigin,
  ): Promise<ConsentRecord> {
    return this.repository.record(tenantId, input, {
      ipHash: hashIp(origin.ip, this.ipSalt),
      userAgent: origin.userAgent ?? null,
    });
  }
}
