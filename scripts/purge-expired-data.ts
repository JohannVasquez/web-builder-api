/**
 * Borra o anonimiza los datos personales que cumplieron su plazo de conservación.
 *
 *   pnpm tsx scripts/purge-expired-data.ts
 *
 * Pensado para correr una vez al día desde cron. Es idempotente: una segunda pasada sobre lo
 * mismo no encuentra nada que hacer, así que se puede ejecutar a mano sin riesgo.
 *
 * Los plazos salen de `RETENTION_*` (ver `.env.example`); sin configurar, de los valores por
 * omisión. Un plazo de pedidos por debajo del mínimo tributario no se obedece.
 *
 * El recuento sale por stdout: es lo que queda en el registro de cron y lo que permite
 * acreditar que el proceso corre.
 */
import { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { EnvConfig } from '@/shared/config/EnvConfig';
import { PurgeExpiredDataUseCase } from '@/modules/DataRetention/application/PurgeExpiredDataUseCase';
import { PrismaRetentionRepository } from '@/modules/DataRetention/infrastructure/PrismaRetentionRepository';
import { PrismaActivityLogRepository } from '@/modules/ActivityLog/infrastructure/PrismaActivityLogRepository';

const optionalDays = (value: string): number | undefined =>
  value === '' ? undefined : Number(value);

const run = async (): Promise<void> => {
  const env = EnvConfig.load(process.env);
  const prisma = new PrismaClient({ datasourceUrl: env.get('DATABASE_URL') });

  try {
    const useCase = new PurgeExpiredDataUseCase(new PrismaRetentionRepository(prisma), {
      contactMessageDays: optionalDays(env.get('RETENTION_CONTACT_DAYS')),
      unsubscribedSubscriberDays: optionalDays(env.get('RETENTION_SUBSCRIBER_DAYS')),
      orderDays: optionalDays(env.get('RETENTION_ORDER_DAYS')),
    });

    const result = await useCase.execute();

    const activityLog = new PrismaActivityLogRepository(prisma);
    await activityLog.record({
      tenantId: null,
      actorType: 'admin',
      actorId: null,
      actorName: 'Cron (Sistema)',
      action: 'dataRetention.purge',
      entityType: 'system',
      entityId: null,
      summary: 'Purga de datos vencidos en todos los clientes',
      after: result,
    });
    // Se registra en ActivityLog (con tenantId nulo) para que quede traza global y auditable del recuento.
  } finally {
    await prisma.$disconnect();
  }
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
