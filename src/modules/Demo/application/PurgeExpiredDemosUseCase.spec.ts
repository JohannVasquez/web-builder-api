import { Demo } from '../domain/Demo';
import { addDays, DemoLifecycleConfig } from '../domain/DemoLifecycleConfig';
import type { DemoRepository } from '../domain/DemoRepository';
import type { NotifyExpiringDemosUseCase } from './NotifyExpiringDemosUseCase';
import type { DemoPurgeResult, PurgeDemoUseCase } from './PurgeDemoUseCase';
import { PurgeExpiredDemosUseCase } from './PurgeExpiredDemosUseCase';

// Lo que se borra y lo que se conserva se prueba contra la base (PrismaDemoRepository.spec.ts);
// aquí, que ningún paso que falla detenga a los demás y que quede en el resumen.
describe('PurgeExpiredDemosUseCase', () => {
  const NOW = new Date('2026-09-26T12:00:00Z');

  const expired = (id: string, daysAgo: number): Demo =>
    new Demo(
      id,
      `${id}-tenant`,
      null,
      null,
      null,
      { type: 'admin', id: null, name: 'Pau' },
      addDays(NOW, -daysAgo - 14),
      addDays(NOW, -daysAgo),
      null,
      null,
      { count: 0, firstAt: null, lastAt: null },
      null,
    );

  const build = (options: {
    readonly due?: Demo[];
    readonly notify?: () => Promise<unknown>;
    readonly purge?: (demoId: string) => Promise<DemoPurgeResult>;
  }): PurgeExpiredDemosUseCase => {
    const repository = {
      findDueForPurge: jest.fn().mockResolvedValue(options.due ?? []),
      findPendingFiles: jest.fn().mockResolvedValue([]),
    } as unknown as DemoRepository;
    const notify = {
      execute:
        options.notify ??
        ((): Promise<unknown> =>
          Promise.resolve({ sent: 2, failed: 1, failedDemoIds: ['sol'] })),
    } as unknown as NotifyExpiringDemosUseCase;
    const purge = {
      retryPendingFiles: () => Promise.resolve({ deleted: 0, pending: 0 }),
      execute: (demoId: string): Promise<DemoPurgeResult> =>
        (
          options.purge ??
          ((): Promise<DemoPurgeResult> => Promise.reject(new Error('sin doble')))
        )(demoId),
    } as unknown as PurgeDemoUseCase;
    return new PurgeExpiredDemosUseCase(
      repository,
      notify,
      purge,
      new DemoLifecycleConfig(),
    );
  };

  const purgedResult = (demo: Demo): DemoPurgeResult => ({
    demo,
    files: { deleted: 2, pending: 0 },
    prospectDeleted: true,
  });

  it('suma avisos, borrados y archivos en el resumen', async () => {
    const luna = expired('luna', 31);
    const run = await build({
      due: [luna],
      purge: () => Promise.resolve(purgedResult(luna)),
    }).execute(NOW);

    expect(run).toEqual({
      warningsSent: 2,
      warningsFailed: 1,
      failedWarnings: ['sol'],
      demosPurged: 1,
      demosFailed: 0,
      failedDemos: [],
      filesDeleted: 2,
      filesPending: 0,
      errors: [],
    });
  });

  it('una demo que falla no detiene a las demás y queda en el resumen', async () => {
    const [luna, sol, mar] = [
      expired('luna', 31),
      expired('sol', 40),
      expired('mar', 50),
    ];
    const run = await build({
      due: [luna, sol, mar],
      purge: (demoId) =>
        demoId === 'sol'
          ? Promise.reject(new Error('deadlock detected'))
          : Promise.resolve(purgedResult(luna)),
    }).execute(NOW);

    expect(run.demosPurged).toBe(2);
    expect(run.failedDemos).toEqual([{ demoId: 'sol', error: 'deadlock detected' }]);
  });

  it('no borra lo que el dominio dice que todavía no corresponde', async () => {
    const purge = jest.fn();
    await build({ due: [expired('luna', 29)], purge }).execute(NOW);

    expect(purge).not.toHaveBeenCalled();
  });

  it('si los avisos no pueden correr, el borrado corre igual', async () => {
    const luna = expired('luna', 31);
    const run = await build({
      due: [luna],
      notify: () => Promise.reject(new Error('SMTP caído')),
      purge: () => Promise.resolve(purgedResult(luna)),
    }).execute(NOW);

    expect(run.demosPurged).toBe(1);
    expect(run.errors).toEqual(['Avisos: SMTP caído']);
  });
});
