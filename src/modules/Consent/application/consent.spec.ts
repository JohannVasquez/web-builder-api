import { ConsentRecord, type ConsentInput } from '../domain/Consent';
import type { ConsentOrigin, ConsentRepository } from '../domain/ConsentRepository';
import { GetCurrentConsentUseCase } from './GetCurrentConsentUseCase';
import { RecordConsentUseCase } from './RecordConsentUseCase';

const TENANT = '018f6f1a-0000-7000-8000-000000000001';
const SALT = 'sal-de-pruebas';

const INPUT: ConsentInput = {
  subject: 'visitante-abc12345',
  source: 'cookies',
  purposes: ['necessary', 'analytics'],
  textVersion: 'cookies-v1',
};

interface Recorded {
  readonly input: ConsentInput;
  readonly origin: ConsentOrigin;
}

interface FakeRepository extends ConsentRepository {
  readonly recorded: Recorded[];
}

const buildRepository = (latest: ConsentRecord | null = null): FakeRepository => {
  const recorded: Recorded[] = [];
  return {
    recorded,
    record: (
      _tenantId: string,
      input: ConsentInput,
      origin: ConsentOrigin,
    ): Promise<ConsentRecord> => {
      recorded.push({ input, origin });
      return Promise.resolve(
        new ConsentRecord(
          `consent-${recorded.length}`,
          input.subject,
          input.source,
          input.purposes,
          input.textVersion,
          new Date(),
        ),
      );
    },
    findLatest: (): Promise<ConsentRecord | null> => Promise.resolve(latest),
  };
};

describe('RecordConsentUseCase', () => {
  it('guarda la huella de la IP, nunca la IP', async () => {
    const repository = buildRepository();
    const useCase = new RecordConsentUseCase(repository, SALT);

    await useCase.execute(TENANT, INPUT, { ip: '200.1.2.3', userAgent: 'Firefox' });

    const [{ origin }] = repository.recorded;
    expect(origin.ipHash).not.toBeNull();
    expect(origin.ipHash).not.toContain('200.1.2.3');
  });

  it('sin sal configurada no guarda huella: mejor sin dato que con uno reversible', async () => {
    const repository = buildRepository();
    const useCase = new RecordConsentUseCase(repository, '');

    await useCase.execute(TENANT, INPUT, { ip: '200.1.2.3', userAgent: 'Firefox' });

    expect(repository.recorded[0].origin.ipHash).toBeNull();
  });

  it('cambiar de opinión escribe una fila nueva, no edita la anterior', async () => {
    const repository = buildRepository();
    const useCase = new RecordConsentUseCase(repository, SALT);

    await useCase.execute(TENANT, INPUT, { ip: '200.1.2.3', userAgent: undefined });
    await useCase.execute(
      TENANT,
      { ...INPUT, purposes: [] },
      { ip: '200.1.2.3', userAgent: undefined },
    );

    expect(repository.recorded).toHaveLength(2);
    expect(repository.recorded[1].input.purposes).toEqual([]);
  });
});

describe('GetCurrentConsentUseCase', () => {
  const stored = new ConsentRecord(
    'consent-1',
    INPUT.subject,
    'cookies',
    ['necessary', 'analytics'],
    'cookies-v1',
    new Date('2026-03-01T10:00:00.000Z'),
  );

  it('un visitante nuevo no tiene consentimiento vigente', async () => {
    const useCase = new GetCurrentConsentUseCase(buildRepository(null));

    const result = await useCase.execute(TENANT, INPUT.subject, 'cookies-v1');

    expect(result.consent).toBeNull();
    expect(result.isCurrent).toBe(false);
  });

  it('con el mismo texto, lo aceptado sigue vigente', async () => {
    const useCase = new GetCurrentConsentUseCase(buildRepository(stored));

    const result = await useCase.execute(TENANT, INPUT.subject, 'cookies-v1');

    expect(result.isCurrent).toBe(true);
  });

  it('si el texto legal cambió, deja de estar vigente y hay que volver a preguntar', async () => {
    const useCase = new GetCurrentConsentUseCase(buildRepository(stored));

    const result = await useCase.execute(TENANT, INPUT.subject, 'cookies-v2');

    expect(result.isCurrent).toBe(false);
    // El registro anterior no se borra: es la prueba de lo que se aceptó entonces.
    expect(result.consent).not.toBeNull();
  });
});
