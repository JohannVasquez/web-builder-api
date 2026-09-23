import {
  DataRightsRequest,
  RESPONSE_DAYS,
  type DataRight,
  type RequestStatus,
} from '../domain/DataRightsRequest';
import type {
  DataRightsRepository,
  ErasureResult,
  NewRequest,
  PersonalDataExport,
} from '../domain/DataRightsRepository';
import type { DataRightsMailer } from '../domain/DataRightsMailer';
import { hashVerificationToken } from '../domain/verificationToken';
import { SubmitDataRightsRequestUseCase } from './SubmitDataRightsRequestUseCase';
import { VerifyDataRightsRequestUseCase } from './VerifyDataRightsRequestUseCase';
import { ListDataRightsRequestsUseCase } from './ListDataRightsRequestsUseCase';

const TENANT = '018f6f1a-0000-7000-8000-000000000001';
const NOW = new Date('2026-09-22T12:00:00.000Z');
const EMAIL = 'persona@ejemplo.cl';

const EMPTY_EXPORT: PersonalDataExport = {
  email: EMAIL,
  contactMessages: [],
  newsletter: [],
  orders: [],
  consents: [],
};

const EMPTY_ERASURE: ErasureResult = {
  contactMessagesDeleted: 0,
  subscribersDeleted: 0,
  ordersAnonymized: 0,
};

interface FakeRepository extends DataRightsRepository {
  readonly created: NewRequest[];
  readonly statuses: { id: string; status: RequestStatus }[];
  readonly exported: string[];
  readonly erased: string[];
  stored: DataRightsRequest | null;
}

const buildRepository = (stored: DataRightsRequest | null = null): FakeRepository => {
  const created: NewRequest[] = [];
  const statuses: { id: string; status: RequestStatus }[] = [];
  const exported: string[] = [];
  const erased: string[] = [];

  return {
    created,
    statuses,
    exported,
    erased,
    stored,
    create: (_tenantId: string, request: NewRequest): Promise<DataRightsRequest> => {
      created.push(request);
      return Promise.resolve(
        new DataRightsRequest(
          'req-1',
          request.right,
          request.email,
          request.details,
          'pendiente',
          NOW,
        ),
      );
    },
    findVerifiable: (): Promise<{
      tenantId: string;
      request: DataRightsRequest;
    } | null> =>
      Promise.resolve(stored === null ? null : { tenantId: TENANT, request: stored }),
    markStatus: (id: string, status: RequestStatus): Promise<void> => {
      statuses.push({ id, status });
      return Promise.resolve();
    },
    listByStatus: (): Promise<DataRightsRequest[]> =>
      Promise.resolve(stored === null ? [] : [stored]),
    exportFor: (_tenantId: string, email: string): Promise<PersonalDataExport> => {
      exported.push(email);
      return Promise.resolve(EMPTY_EXPORT);
    },
    eraseFor: (_tenantId: string, email: string): Promise<ErasureResult> => {
      erased.push(email);
      return Promise.resolve(EMPTY_ERASURE);
    },
  };
};

interface FakeMailer extends DataRightsMailer {
  readonly verifications: { email: string; url: string }[];
  readonly exports: string[];
  readonly erasures: string[];
}

const buildMailer = (): FakeMailer => {
  const verifications: { email: string; url: string }[] = [];
  const exports: string[] = [];
  const erasures: string[] = [];

  return {
    verifications,
    exports,
    erasures,
    sendVerification: (
      email: string,
      _right: DataRight,
      verifyUrl: string,
    ): Promise<void> => {
      verifications.push({ email, url: verifyUrl });
      return Promise.resolve();
    },
    sendExport: (email: string): Promise<void> => {
      exports.push(email);
      return Promise.resolve();
    },
    sendErasureDone: (email: string): Promise<void> => {
      erasures.push(email);
      return Promise.resolve();
    },
  };
};

const pendingRequest = (right: DataRight): DataRightsRequest =>
  new DataRightsRequest('req-1', right, EMAIL, '', 'pendiente', NOW);

describe('presentar una solicitud', () => {
  it('guarda el HASH del token, nunca el token', async () => {
    const repository = buildRepository();
    const mailer = buildMailer();

    await new SubmitDataRightsRequestUseCase(repository, mailer).execute(
      TENANT,
      { right: 'acceso', email: EMAIL, details: '' },
      (token) => `https://acme.cl/datos/verificar/${token}`,
      NOW,
    );

    const token = mailer.verifications[0].url.split('/').pop() ?? '';
    // Quien lea la base no puede hacerse pasar por el titular.
    expect(repository.created[0].verificationTokenHash).not.toBe(token);
    expect(repository.created[0].verificationTokenHash).toBe(
      hashVerificationToken(token),
    );
  });

  it('el enlace caduca en 24 horas', async () => {
    const repository = buildRepository();

    await new SubmitDataRightsRequestUseCase(repository, buildMailer()).execute(
      TENANT,
      { right: 'acceso', email: EMAIL, details: '' },
      (token) => token,
      NOW,
    );

    const hours =
      (repository.created[0].verificationExpiresAt.getTime() - NOW.getTime()) /
      (60 * 60 * 1000);
    expect(hours).toBe(24);
  });

  it('manda el enlace al correo que se indicó, no a otro', async () => {
    const mailer = buildMailer();

    await new SubmitDataRightsRequestUseCase(buildRepository(), mailer).execute(
      TENANT,
      { right: 'cancelacion', email: EMAIL, details: '' },
      (token) => token,
      NOW,
    );

    expect(mailer.verifications[0].email).toBe(EMAIL);
  });
});

describe('verificar una solicitud', () => {
  it('un token con forma inválida ni llega a la base', async () => {
    const repository = buildRepository(pendingRequest('acceso'));

    const outcome = await new VerifyDataRightsRequestUseCase(
      repository,
      buildMailer(),
    ).execute("' OR 1=1 --", NOW);

    expect(outcome.kind).toBe('invalido');
    expect(repository.statuses).toHaveLength(0);
  });

  it('un token que no corresponde a nada vigente no revela por qué', async () => {
    const outcome = await new VerifyDataRightsRequestUseCase(
      buildRepository(null),
      buildMailer(),
    ).execute('a'.repeat(64), NOW);

    expect(outcome.kind).toBe('invalido');
  });

  it('acceso se resuelve solo: es una copia de lo que ya hay', async () => {
    const repository = buildRepository(pendingRequest('acceso'));
    const mailer = buildMailer();

    const outcome = await new VerifyDataRightsRequestUseCase(repository, mailer).execute(
      'a'.repeat(64),
      NOW,
    );

    expect(outcome.kind).toBe('atendida');
    expect(repository.exported).toEqual([EMAIL]);
    expect(mailer.exports).toEqual([EMAIL]);
    expect(repository.statuses.map((entry) => entry.status)).toEqual([
      'verificada',
      'resuelta',
    ]);
  });

  it('portabilidad se resuelve igual que acceso', async () => {
    const repository = buildRepository(pendingRequest('portabilidad'));

    await new VerifyDataRightsRequestUseCase(repository, buildMailer()).execute(
      'a'.repeat(64),
      NOW,
    );

    expect(repository.exported).toEqual([EMAIL]);
  });

  it('cancelación borra y avisa', async () => {
    const repository = buildRepository(pendingRequest('cancelacion'));
    const mailer = buildMailer();

    await new VerifyDataRightsRequestUseCase(repository, mailer).execute(
      'a'.repeat(64),
      NOW,
    );

    expect(repository.erased).toEqual([EMAIL]);
    expect(mailer.erasures).toEqual([EMAIL]);
  });

  it('rectificación queda esperando: depende de qué pide la persona', async () => {
    const repository = buildRepository(pendingRequest('rectificacion'));

    const outcome = await new VerifyDataRightsRequestUseCase(
      repository,
      buildMailer(),
    ).execute('a'.repeat(64), NOW);

    expect(outcome.kind).toBe('pendiente-de-revision');
    expect(repository.statuses.map((entry) => entry.status)).toEqual(['verificada']);
    expect(repository.erased).toHaveLength(0);
  });

  it('oposición tampoco se resuelve sola', async () => {
    const repository = buildRepository(pendingRequest('oposicion'));

    const outcome = await new VerifyDataRightsRequestUseCase(
      repository,
      buildMailer(),
    ).execute('a'.repeat(64), NOW);

    expect(outcome.kind).toBe('pendiente-de-revision');
  });
});

describe('plazo de respuesta', () => {
  it('vence un mes después de presentarse, no de verificarse', async () => {
    // La verificación depende de nosotros; el plazo no puede empezar cuando nos convenga.
    const request = pendingRequest('rectificacion');
    const justoAntes = new Date(request.dueAt().getTime() - 1000);
    const justoDespues = new Date(request.dueAt().getTime() + 1000);

    const [listado] = await new ListDataRightsRequestsUseCase(
      buildRepository(request),
    ).execute(TENANT, null, justoAntes);
    expect(listado.isOverdue).toBe(false);

    const [vencido] = await new ListDataRightsRequestsUseCase(
      buildRepository(request),
    ).execute(TENANT, null, justoDespues);
    expect(vencido.isOverdue).toBe(true);
  });

  it('el plazo son los días que fija la ley', () => {
    const request = pendingRequest('acceso');
    const days = (request.dueAt().getTime() - NOW.getTime()) / (24 * 60 * 60 * 1000);

    expect(days).toBe(RESPONSE_DAYS);
  });

  it('una solicitud resuelta nunca está vencida', () => {
    const resuelta = new DataRightsRequest(
      'req-1',
      'acceso',
      EMAIL,
      '',
      'resuelta',
      NOW,
      NOW,
      NOW,
    );

    expect(resuelta.isOverdue(new Date('2027-01-01T00:00:00.000Z'))).toBe(false);
  });
});
