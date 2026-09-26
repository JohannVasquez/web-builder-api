import { Demo, type DemoOutcome } from './Demo';
import { addDays, DemoLifecycleConfig } from './DemoLifecycleConfig';
import { DemoClosedError, DemoNeverExpiresError } from './errors';

describe('Demo', () => {
  const now = new Date('2026-09-26T12:00:00Z');
  const build = (
    expiresAt: Date | null,
    outcome: DemoOutcome | null = null,
    tenantId: string | null = '018f6f1a-0000-7000-8000-000000000001',
    extensionCount = 0,
  ): Demo =>
    new Demo(
      '018f6f1a-0000-7000-8000-0000000000d1',
      tenantId,
      '018f6f1a-0000-7000-8000-0000000000p1',
      'pasteleria',
      'pastelería',
      { type: 'admin', id: '018f6f1a-0000-7000-8000-0000000000a1', name: 'Pau' },
      new Date('2026-09-20T12:00:00Z'),
      expiresAt,
      outcome,
      null,
      { count: 0, firstAt: null, lastAt: null },
      null,
      extensionCount,
    );
  const config = new DemoLifecycleConfig();
  const inDays = (days: number): Date => addDays(now, days);

  it('por omisión dura 14 días, avisa con 3 y se borra 30 después de vencer', () => {
    expect(config).toEqual({ durationDays: 14, warningDays: 3, purgeGraceDays: 30 });
  });

  it('vence 14 días después de crearse', () => {
    expect(addDays(now, config.durationDays).toISOString()).toBe(
      '2026-10-10T12:00:00.000Z',
    );
  });

  it('está vigente antes de vencer y sin vencimiento', () => {
    expect(build(new Date('2026-09-27T00:00:00Z')).status(now)).toBe('vigente');
    expect(build(null).status(now)).toBe('vigente');
  });

  it('está vencida desde el instante en que vence', () => {
    expect(build(now).status(now)).toBe('vencida');
  });

  it('el resultado manda sobre el vencimiento', () => {
    expect(build(new Date('2026-01-01T00:00:00Z'), 'converted').status(now)).toBe(
      'convertida',
    );
    expect(build(null, 'discarded').status(now)).toBe('descartada');
  });

  it('deja entrar al prospecto solo mientras está vigente', () => {
    expect(build(null).admits('prospect', now)).toBe(true);
    expect(build(now).admits('prospect', now)).toBe(false);
    expect(build(null, 'discarded').admits('prospect', now)).toBe(false);
  });

  it('deja entrar al equipo también vencida o descartada', () => {
    expect(build(now).admits('team', now)).toBe(true);
    expect(build(null, 'discarded').admits('team', now)).toBe(true);
  });

  it('no deja entrar a nadie cuando el sitio ya no existe', () => {
    expect(build(null, null, null).admits('team', now)).toBe(false);
    expect(build(null, null, null).admits('prospect', now)).toBe(false);
  });

  describe('extender', () => {
    it('a una vigente que vence en 5 días la deja venciendo en 19', () => {
      expect(build(inDays(5)).extendedExpiry(now, config.durationDays)).toEqual(
        inDays(19),
      );
    });

    it('a una vencida hace 10 días la deja vigente por 14 días desde hoy', () => {
      const extended = build(inDays(-10)).extendedExpiry(now, config.durationDays);

      expect(extended).toEqual(inDays(14));
      expect(build(extended).status(now)).toBe('vigente');
    });

    it('usa el plazo configurado', () => {
      expect(build(inDays(1)).extendedExpiry(now, 7)).toEqual(inDays(8));
    });

    it.each([
      ['convertida', build(inDays(5), 'converted')],
      ['descartada', build(inDays(5), 'discarded')],
      ['borrada', build(inDays(5), null, null)],
    ])('no extiende una demo %s', (_label, demo) => {
      expect(() => demo.extendedExpiry(now, 14)).toThrow(DemoClosedError);
    });

    it('no extiende una demo sin vencimiento', () => {
      expect(() => build(null).extendedExpiry(now, 14)).toThrow(DemoNeverExpiresError);
    });
  });

  describe('sin vencimiento', () => {
    it('marcarla le quita la fecha y nunca vence', () => {
      const expiry = build(inDays(5)).expiryAfterSetting(true, now, 14);

      expect(expiry).toBeNull();
      expect(build(expiry).status(addDays(now, 3650))).toBe('vigente');
    });

    it('desmarcarla la deja venciendo en 14 días desde hoy', () => {
      expect(build(null).expiryAfterSetting(false, now, 14)).toEqual(inDays(14));
    });

    it('desmarcar una que ya vence no le cambia la fecha', () => {
      expect(build(inDays(5)).expiryAfterSetting(false, now, 14)).toEqual(inDays(5));
    });

    it('no se cambia en una convertida o descartada', () => {
      expect(() => build(null, 'converted').expiryAfterSetting(true, now, 14)).toThrow(
        DemoClosedError,
      );
      expect(() => build(null, 'discarded').expiryAfterSetting(false, now, 14)).toThrow(
        DemoClosedError,
      );
    });
  });

  describe('por vencer', () => {
    it('incluye las vigentes que vencen dentro de la ventana, el borde incluido', () => {
      expect(build(inDays(2)).isAboutToExpire(now, 3)).toBe(true);
      expect(build(inDays(3)).isAboutToExpire(now, 3)).toBe(true);
    });

    it('deja fuera las que vencen después, las vencidas, las sin vencimiento y las cerradas', () => {
      expect(build(inDays(4)).isAboutToExpire(now, 3)).toBe(false);
      expect(build(inDays(-1)).isAboutToExpire(now, 3)).toBe(false);
      expect(build(null).isAboutToExpire(now, 3)).toBe(false);
      expect(build(inDays(2), 'discarded').isAboutToExpire(now, 3)).toBe(false);
      expect(build(inDays(2), 'converted').isAboutToExpire(now, 3)).toBe(false);
    });
  });
});
