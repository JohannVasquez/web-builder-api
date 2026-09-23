import { ConsentInputSchema, ConsentRecord } from './Consent';

const buildRecord = (
  purposes: ('necessary' | 'analytics' | 'advertising')[],
  textVersion = 'cookies-v1',
): ConsentRecord =>
  new ConsentRecord(
    'consent-1',
    'visitante-abc12345',
    'cookies',
    purposes,
    textVersion,
    new Date('2026-03-01T10:00:00.000Z'),
  );

describe('ConsentRecord', () => {
  it('aceptar medición no autoriza publicidad: son finalidades distintas', () => {
    const consent = buildRecord(['necessary', 'analytics']);

    expect(consent.allows('analytics')).toBe(true);
    // Perfilar para publicidad además implica transferir datos fuera del país.
    expect(consent.allows('advertising')).toBe(false);
  });

  it('rechazarlo todo deja un registro igual de válido, solo que sin finalidades', () => {
    const consent = buildRecord([]);

    expect(consent.allows('analytics')).toBe(false);
    expect(consent.toPrimitives().purposes).toEqual([]);
  });

  it('un consentimiento solo vale sobre el texto que la persona leyó', () => {
    const consent = buildRecord(['analytics'], 'cookies-v1');

    expect(consent.appliesTo('cookies-v1')).toBe(true);
    // El texto cambió: hay que volver a preguntar, nadie aceptó lo que no vio.
    expect(consent.appliesTo('cookies-v2')).toBe(false);
  });
});

describe('validación de entrada', () => {
  const valid = {
    subject: 'visitante-abc12345',
    source: 'cookies',
    purposes: ['necessary', 'analytics'],
    textVersion: 'cookies-v1',
  };

  it('acepta un consentimiento completo', () => {
    expect(ConsentInputSchema.parse(valid).purposes).toEqual(['necessary', 'analytics']);
  });

  it('sin finalidades es un rechazo, no un error', () => {
    const parsed = ConsentInputSchema.parse({ ...valid, purposes: undefined });

    expect(parsed.purposes).toEqual([]);
  });

  it('rechaza una finalidad que no existe', () => {
    const result = ConsentInputSchema.safeParse({
      ...valid,
      purposes: ['todo-lo-que-quieras'],
    });

    expect(result.success).toBe(false);
  });

  it('rechaza un origen que no existe', () => {
    expect(ConsentInputSchema.safeParse({ ...valid, source: 'telepatía' }).success).toBe(
      false,
    );
  });

  it('exige la versión del texto: sin ella el registro no prueba nada', () => {
    const result = ConsentInputSchema.safeParse({ ...valid, textVersion: '' });

    expect(result.success).toBe(false);
  });

  it('rechaza un identificador demasiado corto para ser único', () => {
    expect(ConsentInputSchema.safeParse({ ...valid, subject: 'abc' }).success).toBe(
      false,
    );
  });
});
