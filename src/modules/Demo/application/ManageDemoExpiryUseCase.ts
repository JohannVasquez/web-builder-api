import type { RecordActivityUseCase } from '@/modules/ActivityLog/application/RecordActivityUseCase';
import { ConflictError } from '@/shared/domain/ConflictError';
import type { Demo, DemoCreator } from '../domain/Demo';
import type { DemoLifecycleConfig } from '../domain/DemoLifecycleConfig';
import type {
  DemoExpiryChange,
  DemoRepository,
  DemoView,
} from '../domain/DemoRepository';
import { DemoNotFoundError } from '../domain/errors';

export class ManageDemoExpiryUseCase {
  constructor(
    private readonly demoRepository: DemoRepository,
    private readonly config: DemoLifecycleConfig,
    private readonly recordActivity: RecordActivityUseCase,
  ) {}

  // Sin máximo: el prospecto que dice "llámame en un mes" se extiende las veces que haga
  // falta, y el contador queda para las métricas.
  public async extend(
    demoId: string,
    actor: DemoCreator,
    now: Date = new Date(),
  ): Promise<DemoView> {
    const demo = await this.requireDemo(demoId);
    const change: DemoExpiryChange = {
      expiresAt: demo.extendedExpiry(now, this.config.durationDays),
      extensionCount: demo.extensionCount + 1,
    };
    const view = await this.save(demo, change);

    await this.recordActivity.execute({
      tenantId: demo.tenantId,
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      action: 'demo.extend',
      entityType: 'demo',
      entityId: demo.id,
      summary: `Extendió la demo ${view.site?.slug ?? demo.id} por ${String(this.config.durationDays)} días`,
      before: {
        expiresAt: demo.expiresAt?.toISOString() ?? null,
        extensionCount: demo.extensionCount,
      },
      after: {
        expiresAt: change.expiresAt?.toISOString() ?? null,
        extensionCount: change.extensionCount,
      },
    });

    return view;
  }

  public async setNeverExpires(
    demoId: string,
    neverExpires: boolean,
    actor: DemoCreator,
    now: Date = new Date(),
  ): Promise<DemoView> {
    const demo = await this.requireDemo(demoId);
    const expiresAt = demo.expiryAfterSetting(
      neverExpires,
      now,
      this.config.durationDays,
    );
    if (expiresAt?.getTime() === demo.expiresAt?.getTime()) {
      return this.requireView(demoId);
    }
    const view = await this.save(demo, {
      expiresAt,
      extensionCount: demo.extensionCount,
    });

    await this.recordActivity.execute({
      tenantId: demo.tenantId,
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      action: 'demo.expiry.update',
      entityType: 'demo',
      entityId: demo.id,
      summary: neverExpires
        ? `Dejó la demo ${view.site?.slug ?? demo.id} sin vencimiento`
        : `Le volvió a poner vencimiento a la demo ${view.site?.slug ?? demo.id}`,
      before: { expiresAt: demo.expiresAt?.toISOString() ?? null },
      after: { expiresAt: expiresAt?.toISOString() ?? null },
    });

    return view;
  }

  private async save(demo: Demo, change: DemoExpiryChange): Promise<DemoView> {
    const saved = await this.demoRepository.updateExpiry(demo.id, demo.expiresAt, change);
    if (!saved) {
      throw new ConflictError(
        'Alguien cambió el vencimiento de esta demo al mismo tiempo. Vuelve a cargarla e inténtalo de nuevo.',
      );
    }
    return this.requireView(demo.id);
  }

  private async requireDemo(demoId: string): Promise<Demo> {
    const demo = await this.demoRepository.findDemo(demoId);
    if (demo === null) {
      throw new DemoNotFoundError();
    }
    return demo;
  }

  private async requireView(demoId: string): Promise<DemoView> {
    const view = await this.demoRepository.findById(demoId);
    if (view === null) {
      throw new DemoNotFoundError();
    }
    return view;
  }
}
