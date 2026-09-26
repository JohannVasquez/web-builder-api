import { Demo, demoExpiryFrom, type DemoOutcome } from './Demo';

describe('Demo', () => {
  const now = new Date('2026-09-26T12:00:00Z');
  const build = (
    expiresAt: Date | null,
    outcome: DemoOutcome | null = null,
    tenantId: string | null = '018f6f1a-0000-7000-8000-000000000001',
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
    );

  it('vence 14 días después de crearse', () => {
    expect(demoExpiryFrom(now).toISOString()).toBe('2026-10-10T12:00:00.000Z');
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
});
