import { addDays, type DemoLifecycleConfig } from '../domain/DemoLifecycleConfig';
import type { DemoRepository } from '../domain/DemoRepository';
import type { NotifyExpiringDemosUseCase } from './NotifyExpiringDemosUseCase';
import type { PurgeDemoUseCase } from './PurgeDemoUseCase';

// Lo que imprime la tarea diaria: es lo que queda en el log de cron y lo que acredita que el
// borrado corre. Solo ids y contadores: ningún dato del prospecto.
export interface DemoMaintenanceRun {
  readonly warningsSent: number;
  readonly warningsFailed: number;
  readonly failedWarnings: readonly string[];
  readonly demosPurged: number;
  readonly demosFailed: number;
  readonly failedDemos: readonly { readonly demoId: string; readonly error: string }[];
  readonly filesDeleted: number;
  // Archivos que siguen en el bucket al terminar; se reintentan en la pasada siguiente.
  readonly filesPending: number;
  // Un paso entero que no pudo correr (por ejemplo, sin base de datos).
  readonly errors: readonly string[];
}

const MAX_ERROR_LENGTH = 300;

const messageOf = (error: unknown): string =>
  (error instanceof Error ? error.message : 'Error desconocido').slice(
    0,
    MAX_ERROR_LENGTH,
  );

export class PurgeExpiredDemosUseCase {
  constructor(
    private readonly demoRepository: DemoRepository,
    private readonly notifyExpiringDemos: NotifyExpiringDemosUseCase,
    private readonly purgeDemo: PurgeDemoUseCase,
    private readonly config: DemoLifecycleConfig,
  ) {}

  // Idempotente: una demo borrada ya no aparece, un aviso no se repite para el mismo
  // vencimiento y un archivo borrado sale de la lista de pendientes.
  public async execute(now: Date = new Date()): Promise<DemoMaintenanceRun> {
    const errors: string[] = [];

    const warnings = await this.notifyExpiringDemos
      .execute(now)
      .catch((error: unknown) => {
        errors.push(`Avisos: ${messageOf(error)}`);
        return { sent: 0, failed: 0, failedDemoIds: [] };
      });

    let filesDeleted = await this.purgeDemo
      .retryPendingFiles(now)
      .then((run) => run.deleted)
      .catch((error: unknown) => {
        errors.push(`Archivos pendientes: ${messageOf(error)}`);
        return 0;
      });

    const grace = this.config.purgeGraceDays;
    const due = await this.demoRepository
      .findDueForPurge(addDays(now, -grace))
      .then((demos) => demos.filter((demo) => demo.isPurgeDue(now, grace)))
      .catch((error: unknown) => {
        errors.push(`Demos por borrar: ${messageOf(error)}`);
        return [];
      });

    let demosPurged = 0;
    const failedDemos: { demoId: string; error: string }[] = [];
    // Una a una y cada una con su propio manejo: la que falla no detiene a las demás.
    for (const { id: demoId } of due) {
      try {
        const result = await this.purgeDemo.execute(demoId, now);
        demosPurged += 1;
        filesDeleted += result.files.deleted;
      } catch (error) {
        failedDemos.push({ demoId, error: messageOf(error) });
      }
    }

    const filesPending = await this.demoRepository
      .findPendingFiles()
      .then((keys) => keys.length)
      .catch((error: unknown) => {
        errors.push(`Archivos pendientes: ${messageOf(error)}`);
        return 0;
      });

    return {
      warningsSent: warnings.sent,
      warningsFailed: warnings.failed,
      failedWarnings: warnings.failedDemoIds,
      demosPurged,
      demosFailed: failedDemos.length,
      failedDemos,
      filesDeleted,
      filesPending,
      errors,
    };
  }
}
