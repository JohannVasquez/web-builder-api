import type { RecordActivityUseCase } from '@/modules/ActivityLog/application/RecordActivityUseCase';
import { Demo } from '../domain/Demo';
import { addDays, DemoLifecycleConfig } from '../domain/DemoLifecycleConfig';
import type {
  DemoExpiryChange,
  DemoRepository,
  DemoView,
} from '../domain/DemoRepository';
import { DemoClosedError, DemoNotFoundError } from '../domain/errors';
import { ManageDemoExpiryUseCase } from './ManageDemoExpiryUseCase';

describe('ManageDemoExpiryUseCase', () => {
  const NOW = new Date('2026-09-26T12:00:00Z');
  const DEMO_ID = '018f6f1a-0000-7000-8000-0000000000d1';
  const TENANT_ID = '018f6f1a-0000-7000-8000-0000000000e1';
  const actor = {
    type: 'admin' as const,
    id: '018f6f1a-0000-7000-8000-0000000000a1',
    name: 'Pau',
  };

  const withExpiry = (demo: Demo, change: DemoExpiryChange): Demo =>
    new Demo(
      demo.id,
      demo.tenantId,
      demo.prospectId,
      demo.templateId,
      demo.industry,
      demo.creator,
      demo.createdAt,
      change.expiresAt,
      demo.outcome,
      demo.outcomeAt,
      demo.visits,
      demo.purgedAt,
      change.extensionCount,
    );

  // Guarda la demo en memoria y aplica la misma condición que la base: solo escribe si el
  // vencimiento no cambió desde que se leyó.
  const build = (
    expiresAt: Date | null,
    outcome: 'converted' | 'discarded' | null = null,
  ): {
    useCase: ManageDemoExpiryUseCase;
    current: () => Demo;
    activity: jest.Mocked<RecordActivityUseCase>;
  } => {
    let demo = new Demo(
      DEMO_ID,
      TENANT_ID,
      null,
      null,
      null,
      actor,
      addDays(NOW, -20),
      expiresAt,
      outcome,
      outcome === null ? null : NOW,
      { count: 0, firstAt: null, lastAt: null },
      null,
    );
    const view = (): DemoView => ({
      demo,
      site: { tenantId: TENANT_ID, slug: 'demo-luna', name: 'Luna', address: null },
      prospect: null,
    });
    const repository = {
      findDemo: (id: string) => Promise.resolve(id === DEMO_ID ? demo : null),
      findById: (id: string) => Promise.resolve(id === DEMO_ID ? view() : null),
      updateExpiry: (
        _id: string,
        expected: Date | null,
        change: DemoExpiryChange,
      ): Promise<boolean> => {
        if (demo.expiresAt?.getTime() !== expected?.getTime()) {
          return Promise.resolve(false);
        }
        demo = withExpiry(demo, change);
        return Promise.resolve(true);
      },
    } as unknown as DemoRepository;
    const activity = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RecordActivityUseCase>;
    return {
      useCase: new ManageDemoExpiryUseCase(
        repository,
        new DemoLifecycleConfig(),
        activity,
      ),
      current: () => demo,
      activity,
    };
  };

  it('se extiende todas las veces que se quiera y queda contado cuántas', async () => {
    const { useCase, current, activity } = build(addDays(NOW, 5));

    for (let time = 0; time < 3; time += 1) {
      await useCase.extend(DEMO_ID, actor, NOW);
    }

    expect(current().extensionCount).toBe(3);
    expect(current().expiresAt).toEqual(addDays(NOW, 5 + 3 * 14));
    expect(activity.execute).toHaveBeenCalledTimes(3);
  });

  it('extender una vencida hace 10 días la deja vigente por 14 días desde hoy', async () => {
    const { useCase, current } = build(addDays(NOW, -10));
    expect(current().status(NOW)).toBe('vencida');

    const view = await useCase.extend(DEMO_ID, actor, NOW);

    expect(view.demo.expiresAt).toEqual(addDays(NOW, 14));
    expect(view.demo.status(NOW)).toBe('vigente');
  });

  it('sin vencimiento nunca vence; al desmarcarla vence en 14 días desde ese momento', async () => {
    const { useCase, current } = build(addDays(NOW, 5));

    await useCase.setNeverExpires(DEMO_ID, true, actor, NOW);
    const later = addDays(NOW, 400);
    expect(current().status(later)).toBe('vigente');

    await useCase.setNeverExpires(DEMO_ID, false, actor, later);
    expect(current().expiresAt).toEqual(addDays(later, 14));
  });

  it('repetir el mismo cambio de vencimiento no escribe ni registra nada', async () => {
    const { useCase, activity } = build(null);

    await useCase.setNeverExpires(DEMO_ID, true, actor, NOW);

    expect(activity.execute).not.toHaveBeenCalled();
  });

  it('cambiar el vencimiento queda en el registro de actividad', async () => {
    const { useCase, activity } = build(addDays(NOW, 5));

    await useCase.setNeverExpires(DEMO_ID, true, actor, NOW);

    expect(activity.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'demo.expiry.update',
        actorName: 'Pau',
        before: { expiresAt: addDays(NOW, 5).toISOString() },
        after: { expiresAt: null },
      }),
    );
  });

  it.each(['converted', 'discarded'] as const)(
    'no extiende ni cambia el vencimiento de una demo con resultado %s',
    async (outcome) => {
      const { useCase, current } = build(addDays(NOW, 5), outcome);

      await expect(useCase.extend(DEMO_ID, actor, NOW)).rejects.toBeInstanceOf(
        DemoClosedError,
      );
      await expect(
        useCase.setNeverExpires(DEMO_ID, true, actor, NOW),
      ).rejects.toBeInstanceOf(DemoClosedError);
      expect(current().expiresAt).toEqual(addDays(NOW, 5));
    },
  );

  it('una demo que no existe es 404', async () => {
    const { useCase } = build(addDays(NOW, 5));

    await expect(
      useCase.extend('018f6f1a-0000-7000-8000-0000000000ff', actor, NOW),
    ).rejects.toBeInstanceOf(DemoNotFoundError);
  });
});
