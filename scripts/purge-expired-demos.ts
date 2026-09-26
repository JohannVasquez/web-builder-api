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
 *
 * El resumen sale por stdout en una línea JSON: es lo que queda en el registro de cron y lo que
 * permite acreditar que el proceso corre. Termina con código 1 si algo falló.
 */
import 'dotenv/config';
import { EnvConfig } from '@/shared/config/EnvConfig';
import { PrismaConnection } from '@/shared/infrastructure/database/PrismaConnection';
import { SmtpConfig } from '@/modules/Contact/infrastructure/SmtpEmailService';
import { DemoLifecycleConfig } from '@/modules/Demo/domain/DemoLifecycleConfig';
import { PrismaDemoRepository } from '@/modules/Demo/infrastructure/PrismaDemoRepository';
import { SmtpDemoMailer } from '@/modules/Demo/infrastructure/SmtpDemoMailer';
import { NotifyExpiringDemosUseCase } from '@/modules/Demo/application/NotifyExpiringDemosUseCase';

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
    const config = new DemoLifecycleConfig(
      env.get('DEMO_DURATION_DAYS'),
      env.get('DEMO_EXPIRY_WARNING_DAYS'),
    );
    const notify = new NotifyExpiringDemosUseCase(
      new PrismaDemoRepository(prisma),
      new SmtpDemoMailer(smtp, env.get('DEMO_REPLY_TO')),
      config,
    );

    const at = new Date();
    const warnings = await notify.execute(at);

    console.log(
      JSON.stringify({
        at: at.toISOString(),
        proceso: 'demos-vencidas',
        warningsSent: warnings.sent,
        warningsFailed: warnings.failed,
        failedWarnings: warnings.failedDemoIds,
      }),
    );
    if (warnings.failed > 0) {
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
