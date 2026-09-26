import { Demo, type DemoExpiryWarning } from '../domain/Demo';
import { addDays, DemoLifecycleConfig } from '../domain/DemoLifecycleConfig';
import type { DemoExpiryWarningMail, DemoMailer } from '../domain/DemoMailer';
import type { DemoRepository, ExpiryWarningCandidate } from '../domain/DemoRepository';
import { NotifyExpiringDemosUseCase } from './NotifyExpiringDemosUseCase';

// La selección en SQL (vigentes, con correo, dentro de la ventana) se prueba contra la base en
// PrismaDemoRepository.spec.ts; aquí, con reloj controlado, la idempotencia y los reintentos.
describe('NotifyExpiringDemosUseCase', () => {
  const NOW = new Date('2026-09-26T12:00:00Z');
  const config = new DemoLifecycleConfig();

  interface Stored {
    demo: Demo;
    readonly businessName: string;
    readonly email: string | null;
  }

  const demoWith = (
    id: string,
    expiresAt: Date | null,
    warning?: DemoExpiryWarning,
  ): Demo =>
    new Demo(
      id,
      `${id}-tenant`,
      null,
      null,
      null,
      { type: 'admin', id: null, name: 'Pau' },
      addDays(NOW, -12),
      expiresAt,
      null,
      null,
      { count: 0, firstAt: null, lastAt: null },
      null,
      0,
      warning,
    );

  const build = (
    initial: Stored[],
    send: (mail: DemoExpiryWarningMail) => Promise<void> = () => Promise.resolve(),
  ): {
    useCase: NotifyExpiringDemosUseCase;
    sent: DemoExpiryWarningMail[];
    stored: Stored[];
    extend: (id: string, expiresAt: Date) => void;
  } => {
    const stored = initial;
    const find = (id: string): Stored => {
      const found = stored.find((item) => item.demo.id === id);
      if (found === undefined) {
        throw new Error(`No existe ${id}`);
      }
      return found;
    };
    const setWarning = (id: string, change: Partial<DemoExpiryWarning>): void => {
      const item = find(id);
      item.demo = demoWith(id, item.demo.expiresAt, {
        ...item.demo.expiryWarning,
        ...change,
      });
    };
    const repository = {
      findExpiryWarningCandidates: (
        now: Date,
        until: Date,
      ): Promise<ExpiryWarningCandidate[]> =>
        Promise.resolve(
          stored.flatMap(({ demo, businessName, email }) =>
            email !== null &&
            demo.status(now) === 'vigente' &&
            demo.expiresAt !== null &&
            demo.expiresAt <= until
              ? [{ demo, businessName, email }]
              : [],
          ),
        ),
      markExpiryWarningSent: (id: string, sentAt: Date, forExpiry: Date) => {
        setWarning(id, { sentAt, forExpiry, error: null });
        return Promise.resolve();
      },
      markExpiryWarningFailed: (id: string, error: string) => {
        setWarning(id, { error });
        return Promise.resolve();
      },
    } as unknown as DemoRepository;
    const sent: DemoExpiryWarningMail[] = [];
    const mailer: DemoMailer = {
      sendExpiryWarning: async (mail) => {
        await send(mail);
        sent.push(mail);
      },
    };
    return {
      useCase: new NotifyExpiringDemosUseCase(repository, mailer, config),
      sent,
      stored,
      extend: (id, expiresAt): void => {
        const item = find(id);
        item.demo = demoWith(id, expiresAt, item.demo.expiryWarning);
      },
    };
  };

  it('una demo con correo que vence en 2 días recibe el aviso una sola vez', async () => {
    const { useCase, sent, stored } = build([
      {
        demo: demoWith('luna', addDays(NOW, 2)),
        businessName: 'Pastelería Luna',
        email: 'luna@ejemplo.cl',
      },
    ]);

    const first = await useCase.execute(NOW);
    const second = await useCase.execute(addDays(NOW, 1));

    expect(first).toEqual({ sent: 1, failed: 0, failedDemoIds: [] });
    expect(second).toEqual({ sent: 0, failed: 0, failedDemoIds: [] });
    expect(sent).toEqual([
      {
        to: 'luna@ejemplo.cl',
        businessName: 'Pastelería Luna',
        expiresAt: addDays(NOW, 2),
      },
    ]);
    expect(stored[0]?.demo.expiryWarning).toEqual({
      sentAt: NOW,
      forExpiry: addDays(NOW, 2),
      error: null,
    });
  });

  it('una que vence después de la ventana todavía no recibe nada', async () => {
    const { useCase, sent } = build([
      { demo: demoWith('luna', addDays(NOW, 4)), businessName: 'Luna', email: 'l@x.cl' },
    ]);

    await useCase.execute(NOW);

    expect(sent).toEqual([]);
  });

  it('si se extiende después del aviso, recibe uno nuevo antes del nuevo vencimiento', async () => {
    const { useCase, sent, extend } = build([
      { demo: demoWith('luna', addDays(NOW, 2)), businessName: 'Luna', email: 'l@x.cl' },
    ]);
    await useCase.execute(NOW);

    extend('luna', addDays(NOW, 16));
    // Recién extendida está lejos de vencer: nada todavía.
    await useCase.execute(addDays(NOW, 1));
    expect(sent).toHaveLength(1);

    await useCase.execute(addDays(NOW, 14));
    expect(sent.map((mail) => mail.expiresAt)).toEqual([
      addDays(NOW, 2),
      addDays(NOW, 16),
    ]);
  });

  it('un envío que falla queda anotado y se reintenta en la pasada siguiente', async () => {
    let smtpDown = true;
    const { useCase, sent, stored } = build(
      [
        {
          demo: demoWith('luna', addDays(NOW, 2)),
          businessName: 'Luna',
          email: 'l@x.cl',
        },
        { demo: demoWith('sol', addDays(NOW, 2)), businessName: 'Sol', email: 's@x.cl' },
      ],
      (mail) =>
        smtpDown && mail.to === 'l@x.cl'
          ? Promise.reject(new Error('Connection refused'))
          : Promise.resolve(),
    );

    const first = await useCase.execute(NOW);

    // El fallo de una no frena a la otra.
    expect(first).toEqual({ sent: 1, failed: 1, failedDemoIds: ['luna'] });
    expect(stored[0]?.demo.expiryWarning).toEqual({
      sentAt: null,
      forExpiry: null,
      error: 'Connection refused',
    });

    smtpDown = false;
    const second = await useCase.execute(addDays(NOW, 1));

    expect(second).toEqual({ sent: 1, failed: 0, failedDemoIds: [] });
    expect(sent.map((mail) => mail.to)).toEqual(['s@x.cl', 'l@x.cl']);
    expect(stored[0]?.demo.expiryWarning.error).toBeNull();
  });

  it('cada correo lleva solo los datos de su demo', async () => {
    const { useCase, sent } = build([
      { demo: demoWith('luna', addDays(NOW, 1)), businessName: 'Luna', email: 'l@x.cl' },
      { demo: demoWith('sol', addDays(NOW, 2)), businessName: 'Sol', email: 's@x.cl' },
    ]);

    await useCase.execute(NOW);

    expect(sent).toEqual([
      { to: 'l@x.cl', businessName: 'Luna', expiresAt: addDays(NOW, 1) },
      { to: 's@x.cl', businessName: 'Sol', expiresAt: addDays(NOW, 2) },
    ]);
  });
});
