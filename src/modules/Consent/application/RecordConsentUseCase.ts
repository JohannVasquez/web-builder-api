import { randomUUID } from 'node:crypto';
import { hashIp } from '../domain/ipHash';
import { ConsentRecord, type ConsentInput } from '../domain/Consent';
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

  // Lo que respondería `execute` sin guardar nada. Para una demo: quien acepta el aviso de
  // cookies es el prospecto o el vendedor probando, no un visitante cuyo permiso haya que
  // poder acreditar.
  public simulate(input: ConsentInput, now: Date = new Date()): ConsentRecord {
    return new ConsentRecord(
      randomUUID(),
      input.subject,
      input.source,
      input.purposes,
      input.textVersion,
      now,
    );
  }
}
