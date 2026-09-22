import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import {
  ConsentRecord,
  CONSENT_PURPOSES,
  CONSENT_SOURCES,
  type ConsentInput,
  type ConsentPurpose,
  type ConsentSource,
} from '../domain/Consent';
import type { ConsentOrigin, ConsentRepository } from '../domain/ConsentRepository';

interface ConsentRow {
  readonly id: string;
  readonly subject: string;
  readonly source: string;
  readonly purposes: string[];
  readonly textVersion: string;
  readonly createdAt: Date;
}

// Una finalidad que ya no existe en el código se descarta en vez de tumbar la lectura: el
// registro es histórico y puede traer nombres de versiones anteriores.
const toPurposes = (values: readonly string[]): ConsentPurpose[] =>
  values.filter((value): value is ConsentPurpose =>
    (CONSENT_PURPOSES as readonly string[]).includes(value),
  );

const toSource = (value: string): ConsentSource =>
  (CONSENT_SOURCES as readonly string[]).includes(value)
    ? (value as ConsentSource)
    : 'cookies';

export class PrismaConsentRepository implements ConsentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async record(
    tenantId: string,
    input: ConsentInput,
    origin: ConsentOrigin,
  ): Promise<ConsentRecord> {
    const row = await this.prisma.consentRecord.create({
      data: {
        tenantId,
        subject: input.subject,
        source: input.source,
        purposes: [...input.purposes],
        textVersion: input.textVersion,
        ipHash: origin.ipHash,
        userAgent: origin.userAgent?.slice(0, 255) ?? null,
      },
    });
    return this.toDomain(row);
  }

  public async findLatest(
    tenantId: string,
    subject: string,
  ): Promise<ConsentRecord | null> {
    const row = await this.prisma.consentRecord.findFirst({
      where: { tenantId, subject },
      orderBy: { createdAt: 'desc' },
    });
    return row === null ? null : this.toDomain(row);
  }

  private toDomain(row: ConsentRow): ConsentRecord {
    return new ConsentRecord(
      row.id,
      row.subject,
      toSource(row.source),
      toPurposes(row.purposes),
      row.textVersion,
      row.createdAt,
    );
  }
}
