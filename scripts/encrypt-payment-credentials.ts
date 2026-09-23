/**
 * Cifra las credenciales de cobro que quedaron en claro de antes del cifrado.
 *
 *   pnpm tsx scripts/encrypt-payment-credentials.ts
 *
 * No va como migración SQL porque cifrar necesita la clave, que vive fuera de la base: una
 * migración de Prisma no la tiene ni debería tenerla.
 *
 * Es idempotente: una fila ya cifrada se salta. Se puede correr las veces que haga falta.
 */
import { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { EnvConfig } from '@/shared/config/EnvConfig';
import { looksEncrypted, SecretBox } from '@/shared/infrastructure/crypto/SecretBox';

const ENCRYPTED_KEY = 'enc';

const isPlainCredentialMap = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !looksEncrypted((value as Record<string, unknown>)[ENCRYPTED_KEY]) &&
  Object.keys(value).length > 0;

const run = async (): Promise<void> => {
  const env = EnvConfig.load(process.env);
  const secrets = SecretBox.fromEnv(
    env.get('CREDENTIALS_ENCRYPTION_KEY'),
    env.get('CREDENTIALS_ENCRYPTION_RETIRED_KEYS'),
  );
  const prisma = new PrismaClient({ datasourceUrl: env.get('DATABASE_URL') });

  try {
    const rows = await prisma.storeSettings.findMany({
      select: { tenantId: true, paymentCredentials: true },
    });

    let encrypted = 0;
    let skipped = 0;

    for (const row of rows) {
      if (!isPlainCredentialMap(row.paymentCredentials)) {
        skipped += 1;
        continue;
      }
      await prisma.storeSettings.update({
        where: { tenantId: row.tenantId },
        data: {
          paymentCredentials: {
            [ENCRYPTED_KEY]: secrets.encrypt(JSON.stringify(row.paymentCredentials)),
          },
        },
      });
      encrypted += 1;
    }

    console.log(`Credenciales cifradas: ${encrypted}. Sin cambios: ${skipped}.`);
  } finally {
    await prisma.$disconnect();
  }
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
