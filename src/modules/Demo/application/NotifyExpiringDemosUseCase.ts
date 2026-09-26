import { addDays, type DemoLifecycleConfig } from '../domain/DemoLifecycleConfig';
import type { DemoMailer } from '../domain/DemoMailer';
import type { DemoRepository } from '../domain/DemoRepository';

export interface ExpiryWarningRun {
  readonly sent: number;
  readonly failed: number;
  // Solo ids: el motivo queda en la demo y puede traer el correo del prospecto.
  readonly failedDemoIds: readonly string[];
}

// Avisa a cada prospecto con correo que su demo está por vencer. A los que no tienen correo no
// les pasa nada aquí: aparecen en la lista "por vencer" para que el equipo los llame.
export class NotifyExpiringDemosUseCase {
  constructor(
    private readonly demoRepository: DemoRepository,
    private readonly mailer: DemoMailer,
    private readonly config: DemoLifecycleConfig,
  ) {}

  public async execute(now: Date = new Date()): Promise<ExpiryWarningRun> {
    const candidates = await this.demoRepository.findExpiryWarningCandidates(
      now,
      addDays(now, this.config.warningDays),
    );

    let sent = 0;
    const failedDemoIds: string[] = [];
    for (const { demo, businessName, email } of candidates) {
      if (
        demo.expiresAt === null ||
        !demo.needsExpiryWarning(now, this.config.warningDays)
      ) {
        continue;
      }
      // Un correo que falla no frena a los demás: queda anotado y se reintenta mañana.
      try {
        await this.mailer.sendExpiryWarning({
          to: email,
          businessName,
          expiresAt: demo.expiresAt,
        });
      } catch (error) {
        failedDemoIds.push(demo.id);
        await this.demoRepository
          .markExpiryWarningFailed(
            demo.id,
            error instanceof Error ? error.message : 'Error desconocido',
          )
          .catch((markError: unknown) => {
            console.error('[Demo] No se pudo anotar el aviso fallido:', markError);
          });
        continue;
      }
      await this.demoRepository.markExpiryWarningSent(demo.id, now, demo.expiresAt);
      sent += 1;
    }

    return { sent, failed: failedDemoIds.length, failedDemoIds };
  }
}
