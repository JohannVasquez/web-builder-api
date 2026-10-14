import type { RecordActivityUseCase } from '@/modules/ActivityLog/application/RecordActivityUseCase';
import { Demo, type DemoLinkKind, type DemoOutcome } from '../domain/Demo';
import type { DemoAccess, DemoRepository, DemoView } from '../domain/DemoRepository';
import { generateDemoToken } from '../domain/demoToken';
import { DemoNotFoundError } from '../domain/errors';
import { RegenerateDemoLinkUseCase } from './RegenerateDemoLinkUseCase';
import { ValidateDemoAccessUseCase } from './ValidateDemoAccessUseCase';

// Un doble en memoria de los enlaces: lo que se prueba es la regla de acceso de punta a punta
// (emitir, validar, regenerar), no la forma de las llamadas al repositorio.
describe('acceso a una demo', () => {
  const NOW = new Date('2026-09-26T12:00:00Z');
  const TENANT_A = '018f6f1a-0000-7000-8000-0000000000e1';
  const TENANT_B = '018f6f1a-0000-7000-8000-0000000000e2';
  const DEMO_A = '018f6f1a-0000-7000-8000-0000000000d1';
  const DEMO_B = '018f6f1a-0000-7000-8000-0000000000d2';
  const actor = {
    type: 'admin' as const,
    id: '018f6f1a-0000-7000-8000-0000000000a1',
    name: 'Pau',
  };

  const demo = (
    id: string,
    tenantId: string,
    expiresAt: Date | null = new Date('2026-10-10T12:00:00Z'),
    outcome: DemoOutcome | null = null,
  ): Demo =>
    new Demo(
      id,
      tenantId,
      null,
      null,
      null,
      actor,
      NOW,
      expiresAt,
      outcome,
      null,
      { count: 0, firstAt: null, lastAt: null },
      null,
    );

  interface StoredToken {
    demoId: string;
    kind: DemoLinkKind;
    hash: string;
    revokedAt: Date | null;
  }

  const buildRepository = (
    demos: Demo[],
  ): {
    repository: DemoRepository;
    tokens: StoredToken[];
    setDemos: (next: Demo[]) => void;
  } => {
    let current = demos;
    const tokens: StoredToken[] = [];
    const repository = {
      findById: (id: string): Promise<DemoView | null> => {
        const found = current.find((candidate) => candidate.id === id);
        return Promise.resolve(
          found === undefined
            ? null
            : {
                demo: found,
                site: {
                  tenantId: found.tenantId ?? '',
                  slug: 'demo-luna',
                  name: 'Luna',
                  address: 'demo-luna.webbuilder.co',
                },
                prospect: null,
              },
        );
      },
      replaceAccessToken: (
        demoId: string,
        kind: DemoLinkKind,
        hash: string,
      ): Promise<void> => {
        tokens
          .filter((token) => token.demoId === demoId && token.kind === kind)
          .forEach((token) => {
            token.revokedAt ??= NOW;
          });
        tokens.push({ demoId, kind, hash, revokedAt: null });
        return Promise.resolve();
      },
      findAccess: (hash: string): Promise<DemoAccess | null> => {
        const token = tokens.find((candidate) => candidate.hash === hash);
        const owner = current.find((candidate) => candidate.id === token?.demoId);
        return Promise.resolve(
          token === undefined || owner === undefined
            ? null
            : { kind: token.kind, revokedAt: token.revokedAt, demo: owner },
        );
      },
    } as unknown as DemoRepository;
    return {
      repository,
      tokens,
      setDemos: (next: Demo[]): void => {
        current = next;
      },
    };
  };

  const activity = (): jest.Mocked<RecordActivityUseCase> =>
    ({
      execute: jest.fn().mockResolvedValue(undefined),
    }) as unknown as jest.Mocked<RecordActivityUseCase>;

  const issue = async (
    repository: DemoRepository,
    demoId: string,
    kind: DemoLinkKind,
    log = activity(),
  ): Promise<string> =>
    (await new RegenerateDemoLinkUseCase(repository, log).execute(demoId, kind, actor))
      .token;

  it('el enlace de prospecto vigente da acceso a su demo', async () => {
    const { repository } = buildRepository([demo(DEMO_A, TENANT_A)]);
    const token = await issue(repository, DEMO_A, 'prospect');

    const access = await new ValidateDemoAccessUseCase(repository).execute(
      TENANT_A,
      token,
      NOW,
    );

    expect(access).toEqual({ demoId: DEMO_A, kind: 'prospect' });
  });

  it('el enlace de la demo A en la dirección de la demo B no da acceso', async () => {
    const { repository } = buildRepository([
      demo(DEMO_A, TENANT_A),
      demo(DEMO_B, TENANT_B),
    ]);
    const tokenA = await issue(repository, DEMO_A, 'prospect');
    const teamA = await issue(repository, DEMO_A, 'team');

    const validate = new ValidateDemoAccessUseCase(repository);

    expect(await validate.execute(TENANT_B, tokenA, NOW)).toBeNull();
    expect(await validate.execute(TENANT_B, teamA, NOW)).toBeNull();
  });

  it('un token inexistente o con otra forma no da acceso', async () => {
    const { repository } = buildRepository([demo(DEMO_A, TENANT_A)]);
    const validate = new ValidateDemoAccessUseCase(repository);

    expect(await validate.execute(TENANT_A, generateDemoToken().token, NOW)).toBeNull();
    expect(await validate.execute(TENANT_A, 'prev_abc', NOW)).toBeNull();
  });

  it.each([
    ['vencida', demo(DEMO_A, TENANT_A, NOW)],
    ['descartada', demo(DEMO_A, TENANT_A, null, 'discarded')],
  ])('con la demo %s, el equipo entra y el prospecto no', async (_label, closed) => {
    const { repository, setDemos } = buildRepository([demo(DEMO_A, TENANT_A)]);
    const prospectToken = await issue(repository, DEMO_A, 'prospect');
    const teamToken = await issue(repository, DEMO_A, 'team');
    setDemos([closed]);

    const validate = new ValidateDemoAccessUseCase(repository);

    expect(await validate.execute(TENANT_A, prospectToken, NOW)).toBeNull();
    expect(await validate.execute(TENANT_A, teamToken, NOW)).toEqual({
      demoId: DEMO_A,
      kind: 'team',
    });
  });

  it('al regenerar un enlace, el anterior deja de funcionar en la petición siguiente', async () => {
    const { repository } = buildRepository([demo(DEMO_A, TENANT_A)]);
    const validate = new ValidateDemoAccessUseCase(repository);
    const before = await issue(repository, DEMO_A, 'prospect');
    const team = await issue(repository, DEMO_A, 'team');

    const after = await issue(repository, DEMO_A, 'prospect');

    expect(await validate.execute(TENANT_A, before, NOW)).toBeNull();
    expect(await validate.execute(TENANT_A, after, NOW)).not.toBeNull();
    // Regenerar el del prospecto no toca el del equipo.
    expect(await validate.execute(TENANT_A, team, NOW)).not.toBeNull();
  });

  it('el token no se guarda ni se registra en claro', async () => {
    const { repository, tokens } = buildRepository([demo(DEMO_A, TENANT_A)]);
    const log = activity();

    const token = await issue(repository, DEMO_A, 'team', log);

    expect(JSON.stringify(tokens)).not.toContain(token);
    expect(JSON.stringify(log.execute.mock.calls)).not.toContain(token);
    expect(log.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'demo.link.regenerate',
        after: { kind: 'team' },
      }),
    );
  });

  it('no regenera el enlace de una demo que no existe', async () => {
    const { repository } = buildRepository([]);

    await expect(issue(repository, DEMO_A, 'team')).rejects.toBeInstanceOf(
      DemoNotFoundError,
    );
  });
});
