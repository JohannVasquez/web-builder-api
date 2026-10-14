import express, { type Express, type RequestHandler } from 'express';
import request from 'supertest';
import { ErrorHandler } from '@/shared/presentation/ErrorHandler';
import { Tenant } from '@/modules/Tenant/domain/Tenant';
import type { RecordActivityUseCase } from '@/modules/ActivityLog/application/RecordActivityUseCase';
import { ValidateDemoAccessUseCase } from '../application/ValidateDemoAccessUseCase';
import type { RecordDemoVisitUseCase } from '../application/RecordDemoVisitUseCase';
import { ManageDemoExpiryUseCase } from '../application/ManageDemoExpiryUseCase';
import { Demo, type DemoLinkKind } from '../domain/Demo';
import { addDays, DemoLifecycleConfig } from '../domain/DemoLifecycleConfig';
import type {
  DemoAccess,
  DemoExpiryChange,
  DemoRepository,
} from '../domain/DemoRepository';
import { generateDemoToken } from '../domain/demoToken';
import { createDemoGuard, createDemoVisitTracker } from './demoGuard';

describe('visitas de una demo', () => {
  const DEMO_ID = '018f6f1a-0000-7000-8000-0000000000d1';
  const PROSPECT_TOKEN = `demo_${'1'.repeat(64)}`;
  const TEAM_TOKEN = `demo_${'2'.repeat(64)}`;
  const tenant = new Tenant(
    '018f6f1a-0000-7000-8000-0000000000e1',
    'demo-luna',
    'Luna',
    null,
    'demo',
  );

  // Mismo orden que app.ts en /api/pages: resolver, guarda, registro de visitas, páginas.
  const build = (execute: jest.Mock): Express => {
    const validate = {
      execute: (_tenantId: string, token: string) =>
        Promise.resolve(
          token === PROSPECT_TOKEN
            ? { demoId: DEMO_ID, kind: 'prospect' }
            : token === TEAM_TOKEN
              ? { demoId: DEMO_ID, kind: 'team' }
              : null,
        ),
    } as unknown as ValidateDemoAccessUseCase;
    const resolver: RequestHandler = (_req, res, next) => {
      (res.locals as { tenant?: Tenant }).tenant = tenant;
      next();
    };
    const pages = express.Router();
    pages.get('/', (_req, res) => {
      res.json({ pages: [] });
    });
    pages.get('/:slug', (req, res) => {
      if (req.params.slug === 'no-existe') {
        res.status(404).json({ error: 'NotFound' });
        return;
      }
      res.json({ slug: req.params.slug });
    });
    const app = express();
    app.use(
      '/api/pages',
      resolver,
      createDemoGuard(validate),
      createDemoVisitTracker({ execute } as unknown as RecordDemoVisitUseCase),
      pages,
    );
    app.use(new ErrorHandler().handle);
    return app;
  };

  // El registro corre después de responder: se espera a que se asiente.
  const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

  it('cada página que abre el prospecto es una visita, con su página', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const app = build(execute);

    for (const slug of ['home', 'productos', 'contacto']) {
      await request(app)
        .get(`/api/pages/${slug}`)
        .set('X-Demo-Token', PROSPECT_TOKEN)
        .set('User-Agent', 'Mozilla/5.0 (iPhone)');
    }
    await settle();

    expect(execute).toHaveBeenCalledTimes(3);
    expect(
      (execute.mock.calls as [string, { pageSlug: string }][]).map(
        ([, visit]) => visit.pageSlug,
      ),
    ).toEqual(['home', 'productos', 'contacto']);
    expect(execute).toHaveBeenCalledWith(
      DEMO_ID,
      expect.objectContaining({ userAgent: 'Mozilla/5.0 (iPhone)' }),
    );
  });

  it('el equipo no registra visitas', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const app = build(execute);

    const response = await request(app)
      .get('/api/pages/home')
      .set('X-Demo-Token', TEAM_TOKEN);
    await settle();

    expect(response.status).toBe(200);
    expect(execute).not.toHaveBeenCalled();
  });

  it('no cuenta el listado ni una página que no existe', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const app = build(execute);

    await request(app).get('/api/pages').set('X-Demo-Token', PROSPECT_TOKEN);
    await request(app).get('/api/pages/no-existe').set('X-Demo-Token', PROSPECT_TOKEN);
    await settle();

    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    ['rechaza', jest.fn().mockRejectedValue(new Error('base caída'))],
    [
      'lanza',
      jest.fn().mockImplementation(() => {
        throw new Error('explota');
      }),
    ],
  ])('si el registro %s, la página se sirve igual', async (_label, execute) => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = build(execute);

    const response = await request(app)
      .get('/api/pages/home')
      .set('X-Demo-Token', PROSPECT_TOKEN);
    await settle();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ slug: 'home' });
    expect(execute).toHaveBeenCalled();
    error.mockRestore();
  });

  it('la página no espera al registro', async () => {
    // Un registro que nunca termina no puede colgar la respuesta.
    const execute = jest.fn().mockReturnValue(new Promise(() => undefined));
    const app = build(execute);

    const response = await request(app)
      .get('/api/pages/home')
      .set('X-Demo-Token', PROSPECT_TOKEN);

    expect(response.status).toBe(200);
  });
});

// El vencimiento se evalúa con la hora de cada petición: el reloj de la guarda se controla
// para mirar el instante exacto en que la demo vence, sin depender de la hora real.
describe('vencimiento del enlace', () => {
  const CREATED = new Date('2026-09-26T12:00:00Z');
  const EXPIRES = addDays(CREATED, 14);
  const DEMO_ID = '018f6f1a-0000-7000-8000-0000000000d1';
  const tenant = new Tenant(
    '018f6f1a-0000-7000-8000-0000000000e1',
    'demo-luna',
    'Luna',
    null,
    'demo',
  );
  const actor = { type: 'admin' as const, id: null, name: 'Pau' };
  const prospect = generateDemoToken();
  const team = generateDemoToken();

  const build = (): {
    app: Express;
    setClock: (at: Date) => void;
    expiry: ManageDemoExpiryUseCase;
  } => {
    let now = CREATED;
    let demo = new Demo(
      DEMO_ID,
      tenant.id,
      null,
      null,
      null,
      actor,
      CREATED,
      EXPIRES,
      null,
      null,
      { count: 0, firstAt: null, lastAt: null },
      null,
    );
    const kinds = new Map<string, DemoLinkKind>([
      [prospect.hash, 'prospect'],
      [team.hash, 'team'],
    ]);
    const repository = {
      findAccess: (hash: string): Promise<DemoAccess | null> => {
        const kind = kinds.get(hash);
        return Promise.resolve(
          kind === undefined ? null : { kind, revokedAt: null, demo },
        );
      },
      findDemo: () => Promise.resolve(demo),
      findById: () => Promise.resolve({ demo, site: null, prospect: null }),
      updateExpiry: (_id: string, _expected: Date | null, change: DemoExpiryChange) => {
        demo = new Demo(
          demo.id,
          demo.tenantId,
          null,
          null,
          null,
          actor,
          CREATED,
          change.expiresAt,
          null,
          null,
          demo.visits,
          null,
          change.extensionCount,
        );
        return Promise.resolve(true);
      },
    } as unknown as DemoRepository;

    const resolver: RequestHandler = (_req, res, next) => {
      (res.locals as { tenant?: Tenant }).tenant = tenant;
      next();
    };
    const app = express();
    app.use(
      '/api/pages',
      resolver,
      createDemoGuard(new ValidateDemoAccessUseCase(repository), () => now),
      (_req: express.Request, res: express.Response) => {
        res.json({ slug: 'home' });
      },
    );
    app.use(new ErrorHandler().handle);
    return {
      app,
      setClock: (at: Date): void => {
        now = at;
      },
      expiry: new ManageDemoExpiryUseCase(repository, new DemoLifecycleConfig(), {
        execute: jest.fn().mockResolvedValue(undefined),
      } as unknown as RecordActivityUseCase),
    };
  };

  const open = (app: Express, token: string): Promise<request.Response> =>
    request(app).get('/api/pages/home').set('X-Demo-Token', token);

  it('el prospecto entra hasta el último milisegundo y recibe 404 en el instante en que vence', async () => {
    const { app, setClock } = build();

    setClock(new Date(EXPIRES.getTime() - 1));
    expect((await open(app, prospect.token)).status).toBe(200);

    setClock(EXPIRES);
    const expired = await open(app, prospect.token);
    expect(expired.status).toBe(404);
    expect(expired.body).toEqual({
      error: 'NotFound',
      message: 'No encontramos lo que buscas.',
    });
  });

  it('con la demo vencida, el enlace del equipo sigue funcionando', async () => {
    const { app, setClock } = build();

    setClock(addDays(EXPIRES, 20));

    expect((await open(app, team.token)).status).toBe(200);
  });

  it('extender una demo vencida hace 10 días devuelve el acceso al prospecto con el mismo enlace', async () => {
    const { app, setClock, expiry } = build();
    const today = addDays(EXPIRES, 10);
    setClock(today);
    expect((await open(app, prospect.token)).status).toBe(404);

    const view = await expiry.extend(DEMO_ID, actor, today);

    expect(view.demo.expiresAt).toEqual(addDays(today, 14));
    expect((await open(app, prospect.token)).status).toBe(200);
    setClock(addDays(today, 14));
    expect((await open(app, prospect.token)).status).toBe(404);
  });
});
