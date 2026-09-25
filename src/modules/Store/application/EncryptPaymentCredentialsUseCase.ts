import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import type { SecretBox } from '@/shared/infrastructure/crypto/SecretBox';
import { looksEncrypted } from '@/shared/infrastructure/crypto/SecretBox';

const ENCRYPTED_KEY = 'enc';

const isPlainCredentialMap = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !looksEncrypted((value as Record<string, unknown>)[ENCRYPTED_KEY]) &&
  Object.keys(value).length > 0;

export class EncryptPaymentCredentialsUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly secrets: SecretBox,
  ) {}

  public async execute(): Promise<{ encrypted: number; skipped: number }> {
    const rows = await this.prisma.storeSettings.findMany({
      select: { tenantId: true, paymentCredentials: true },
    });

    let encrypted = 0;
    let skipped = 0;

    for (const row of rows) {
      if (!isPlainCredentialMap(row.paymentCredentials)) {
        skipped += 1;
        continue;
      }
      await this.prisma.storeSettings.update({
        where: { tenantId: row.tenantId },
        data: {
          paymentCredentials: {
            [ENCRYPTED_KEY]: this.secrets.encrypt(JSON.stringify(row.paymentCredentials)),
          },
        },
      });
      encrypted += 1;
    }

    return { encrypted, skipped };
  }
}
