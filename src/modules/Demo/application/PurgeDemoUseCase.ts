import type { RecordActivityUseCase } from '@/modules/ActivityLog/application/RecordActivityUseCase';
import type { StorageProvider } from '@/modules/FileStorage/domain/StorageProvider';
import type { Demo, DemoCreator } from '../domain/Demo';
import type { DemoRepository } from '../domain/DemoRepository';
import { DemoNotFoundError } from '../domain/errors';

export interface FileDeletionRun {
  readonly deleted: number;
  readonly pending: number;
}

export interface DemoPurgeResult {
  // La fila anónima que queda para métricas.
  readonly demo: Demo;
  readonly files: FileDeletionRun;
  readonly prospectDeleted: boolean;
}

// Un solo borrado para la tarea diaria y para el botón del owner: lo que se borra y lo que se
// conserva no puede depender de quién lo pidió.
export class PurgeDemoUseCase {
  constructor(
    private readonly demoRepository: DemoRepository,
    private readonly storageProvider: StorageProvider,
    private readonly recordActivity: RecordActivityUseCase,
  ) {}

  public async execute(demoId: string, now: Date = new Date()): Promise<DemoPurgeResult> {
    const demo = await this.demoRepository.findDemo(demoId);
    if (demo === null) {
      throw new DemoNotFoundError();
    }
    demo.assertCanBePurged();

    const purged = await this.demoRepository.purge(demoId, now);
    // Fuera de la transacción: el bucket no participa de ella. Lo que no salga queda anotado y
    // la tarea diaria lo reintenta.
    const files = await this.deleteFiles(purged.pendingFileKeys, now);
    return { demo: purged.demo, files, prospectDeleted: purged.prospectDeleted };
  }

  // El borrado manual del owner: no espera el período de gracia y deja el mismo rastro.
  public async deleteNow(
    demoId: string,
    actor: DemoCreator,
    now: Date = new Date(),
  ): Promise<DemoPurgeResult> {
    const result = await this.execute(demoId, now);

    // Sin tenant (ya no existe) y sin el nombre del negocio ni la dirección: el registro de
    // actividad sobrevive a la demo y no puede guardar lo que el borrado acaba de quitar.
    await this.recordActivity.execute({
      tenantId: null,
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      action: 'demo.delete',
      entityType: 'demo',
      entityId: demoId,
      summary: `Borró la demo ${demoId} y los datos de su prospecto`,
      after: {
        purgedAt: now.toISOString(),
        filesDeleted: result.files.deleted,
        filesPending: result.files.pending,
        prospectDeleted: result.prospectDeleted,
      },
    });

    return result;
  }

  public async retryPendingFiles(now: Date = new Date()): Promise<FileDeletionRun> {
    return this.deleteFiles(await this.demoRepository.findPendingFiles(), now);
  }

  private async deleteFiles(
    keys: readonly string[],
    now: Date,
  ): Promise<FileDeletionRun> {
    let deleted = 0;
    for (const key of keys) {
      try {
        // Idempotente: una key que ya no está en el bucket cuenta como borrada.
        await this.storageProvider.delete(key);
        await this.demoRepository.resolvePendingFile(key);
        deleted += 1;
      } catch (error) {
        await this.demoRepository
          .failPendingFile(
            key,
            error instanceof Error ? error.message : 'Error desconocido',
            now,
          )
          .catch((markError: unknown) => {
            console.error('[Demo] No se pudo anotar el archivo pendiente:', markError);
          });
      }
    }
    return { deleted, pending: keys.length - deleted };
  }
}
