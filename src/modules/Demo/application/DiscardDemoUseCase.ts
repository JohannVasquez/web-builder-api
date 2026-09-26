import type { RecordActivityUseCase } from '@/modules/ActivityLog/application/RecordActivityUseCase';
import type { SiteCacheInvalidator } from '@/modules/SiteCache/domain/SiteCacheInvalidator';
import { ConflictError } from '@/shared/domain/ConflictError';
import type { Demo, DemoCreator, DemoDiscardReason } from '../domain/Demo';
import { addDays, type DemoLifecycleConfig } from '../domain/DemoLifecycleConfig';
import type { DemoRepository, DemoView } from '../domain/DemoRepository';
import { DemoNotFoundError } from '../domain/errors';

// Descartar es el "no, gracias" del prospecto: su enlace deja de servir al instante y la demo
// sigue su camino al borrado desde hoy. No es borrar: dentro del período de gracia se recupera.
export class DiscardDemoUseCase {
  constructor(
    private readonly demoRepository: DemoRepository,
    private readonly config: DemoLifecycleConfig,
    private readonly cacheInvalidator: SiteCacheInvalidator,
    private readonly recordActivity: RecordActivityUseCase,
  ) {}

  public async discard(
    demoId: string,
    reason: DemoDiscardReason | null,
    actor: DemoCreator,
    now: Date = new Date(),
  ): Promise<DemoView> {
    const demo = await this.requireDemo(demoId);
    if (!demo.needsDiscard()) {
      return this.requireView(demoId);
    }
    if (!(await this.demoRepository.discard(demoId, reason, now))) {
      // Otra petición le dio un resultado entre la lectura y la escritura. Si fue otro descarte,
      // da lo mismo (idempotente); si fue una conversión, la regla de siempre responde.
      (await this.requireDemo(demoId)).needsDiscard();
      return this.requireView(demoId);
    }
    const view = await this.requireView(demoId);
    await this.forget(view);

    await this.recordActivity.execute({
      tenantId: demo.tenantId,
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      action: 'demo.discard',
      entityType: 'demo',
      entityId: demo.id,
      summary: `Descartó la demo ${view.site?.slug ?? demo.id}${reason === null ? '' : ` (motivo: ${reason})`}`,
      before: { expiresAt: demo.expiresAt?.toISOString() ?? null },
      after: { reason, outcomeAt: now.toISOString() },
    });
    return view;
  }

  // El prospecto que llama de vuelta: la demo vuelve a estar vigente por el plazo completo desde
  // hoy, y el prospecto entra con el mismo enlace (descartar no lo anuló).
  public async restore(
    demoId: string,
    actor: DemoCreator,
    now: Date = new Date(),
  ): Promise<DemoView> {
    const demo = await this.requireDemo(demoId);
    demo.assertCanBeRestored(now, this.config.purgeGraceDays);
    const expiresAt = addDays(now, this.config.durationDays);
    // `assertCanBeRestored` garantiza que está descartada, así que tiene fecha de descarte.
    const discardedAt = demo.outcomeAt ?? now;
    if (!(await this.demoRepository.restore(demoId, discardedAt, expiresAt))) {
      throw new ConflictError(
        'Alguien cambió esta demo al mismo tiempo. Vuelve a cargarla e inténtalo de nuevo.',
      );
    }
    const view = await this.requireView(demoId);
    await this.forget(view);

    await this.recordActivity.execute({
      tenantId: demo.tenantId,
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      action: 'demo.restore',
      entityType: 'demo',
      entityId: demo.id,
      summary: `Recuperó la demo descartada ${view.site?.slug ?? demo.id}`,
      before: {
        outcomeAt: demo.outcomeAt?.toISOString() ?? null,
        reason: demo.discardReason,
        expiresAt: demo.expiresAt?.toISOString() ?? null,
      },
      after: { expiresAt: expiresAt.toISOString() },
    });
    return view;
  }

  // Una demo responde `no-store`, pero si algo intermedio guardó una página, deja de servirla.
  private async forget(view: DemoView): Promise<void> {
    if (view.site?.address != null) {
      await this.cacheInvalidator.invalidate([view.site.address]);
    }
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
