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
import { SecretBox } from '@/shared/infrastructure/crypto/SecretBox';
import { EncryptPaymentCredentialsUseCase } from '@/modules/Store/application/EncryptPaymentCredentialsUseCase';

const run = async (): Promise<void> => {
  const env = EnvConfig.load(process.env);
  const secrets = SecretBox.fromEnv(
    env.get('CREDENTIALS_ENCRYPTION_KEY'),
    env.get('CREDENTIALS_ENCRYPTION_RETIRED_KEYS'),
  );
  const prisma = new PrismaClient({ datasourceUrl: env.get('DATABASE_URL') });

  try {
    const useCase = new EncryptPaymentCredentialsUseCase(prisma, secrets);
    const result = await useCase.execute();
    console.log(`Credenciales cifradas: ${result.encrypted}. Sin cambios: ${result.skipped}.`);
  } finally {
    await prisma.$disconnect();
  }
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
