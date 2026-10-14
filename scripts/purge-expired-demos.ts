/**
 * Tarea diaria de las demos de prospecto.
 *
 *   pnpm purge:demos        (o pnpm tsx scripts/purge-expired-demos.ts)
 *
 * Pensada para correr una vez al día desde cron. Es idempotente: una segunda pasada no
 * encuentra nada que hacer, así que se puede ejecutar a mano sin riesgo.
 *
 * 1. Avisa por correo a cada prospecto cuya demo vigente vence dentro de
 *    `DEMO_EXPIRY_WARNING_DAYS`, una vez por vencimiento. Los que fallan se reintentan en la
 *    pasada siguiente.
 * 2. Reintenta borrar del bucket los archivos que quedaron pendientes en pasadas anteriores.
 * 3. Borra las demos vencidas (o descartadas) hace más de `DEMO_PURGE_GRACE_DAYS`, sin
 *    convertir ni marcadas "sin vencimiento": el sitio, sus archivos, visitas, enlaces y el
 *    prospecto si no le queda otra demo. De cada una queda la fila anónima para métricas. Una
 *    que falla no detiene a las demás.
 *
 * El resumen sale por stdout en una línea JSON: es lo que queda en el registro de cron y lo que
 * permite acreditar que el proceso corre. Termina con código 1 si algo falló.
 */
import 'dotenv/config';
import { EnvConfig } from '@/shared/config/EnvConfig';
import { PrismaConnection } from '@/shared/infrastructure/database/PrismaConnection';
import { SmtpConfig } from '@/modules/Contact/infrastructure/SmtpEmailService';
import {
  S3CompatibleStorageProvider,
  S3StorageConfig,
} from '@/modules/FileStorage/infrastructure/S3CompatibleStorageProvider';
import { RecordActivityUseCase } from '@/modules/ActivityLog/application/RecordActivityUseCase';
import { PrismaActivityLogRepository } from '@/modules/ActivityLog/infrastructure/PrismaActivityLogRepository';
import { DemoLifecycleConfig } from '@/modules/Demo/domain/DemoLifecycleConfig';
import { PrismaDemoRepository } from '@/modules/Demo/infrastructure/PrismaDemoRepository';
import { SmtpDemoMailer } from '@/modules/Demo/infrastructure/SmtpDemoMailer';
import { NotifyExpiringDemosUseCase } from '@/modules/Demo/application/NotifyExpiringDemosUseCase';
import { PurgeDemoUseCase } from '@/modules/Demo/application/PurgeDemoUseCase';
import { PurgeExpiredDemosUseCase } from '@/modules/Demo/application/PurgeExpiredDemosUseCase';

const run = async (): Promise<void> => {
  const env = EnvConfig.load(process.env);
  const connection = new PrismaConnection(env.get('DATABASE_URL'));
  const prisma = connection.getClient();

  try {
    const smtp = new SmtpConfig(
      env.get('SMTP_HOST'),
      env.get('SMTP_PORT'),
      env.get('SMTP_SECURE'),
      env.get('SMTP_USER'),
      env.get('SMTP_PASS'),
      env.get('CONTACT_EMAIL_FROM'),
      env.get('CONTACT_EMAIL_TO'),
    );
    const storage = new S3CompatibleStorageProvider(
      new S3StorageConfig(
        env.get('STORAGE_ENDPOINT'),
        env.get('STORAGE_REGION'),
        env.get('STORAGE_BUCKET'),
        env.get('STORAGE_ACCESS_KEY'),
        env.get('STORAGE_SECRET_KEY'),
        env.get('STORAGE_DRIVER') === 'minio',
      ),
    );
    const config = new DemoLifecycleConfig(
      env.get('DEMO_DURATION_DAYS'),
      env.get('DEMO_EXPIRY_WARNING_DAYS'),
      env.get('DEMO_PURGE_GRACE_DAYS'),
    );
    const repository = new PrismaDemoRepository(prisma);
    const activity = new RecordActivityUseCase(new PrismaActivityLogRepository(prisma));
    const useCase = new PurgeExpiredDemosUseCase(
      repository,
      new NotifyExpiringDemosUseCase(
        repository,
        new SmtpDemoMailer(smtp, env.get('DEMO_REPLY_TO')),
        config,
      ),
      new PurgeDemoUseCase(repository, storage, activity),
      config,
    );

    const at = new Date();
    const result = await useCase.execute(at);

    console.log(
      JSON.stringify({ at: at.toISOString(), proceso: 'demos-vencidas', ...result }),
    );

    // Traza global en el registro de actividad, como la purga de datos vencidos. Solo
    // contadores e ids: nada del prospecto.
    await activity.execute({
      tenantId: null,
      actorType: 'admin',
      actorId: null,
      actorName: 'Cron (Sistema)',
      action: 'demo.purge',
      entityType: 'system',
      entityId: null,
      summary: `Tarea diaria de demos: ${String(result.demosPurged)} borradas, ${String(result.warningsSent)} avisos`,
      after: { ...result },
    });

    if (result.warningsFailed > 0 || result.demosFailed > 0 || result.errors.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await connection.close();
  }
};

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
