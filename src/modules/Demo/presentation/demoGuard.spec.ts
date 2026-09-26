import express, { type Express, type RequestHandler } from 'express';
import request from 'supertest';
import { ErrorHandler } from '@/shared/presentation/ErrorHandler';
import { Tenant } from '@/modules/Tenant/domain/Tenant';
import type { ValidateDemoAccessUseCase } from '../application/ValidateDemoAccessUseCase';
import type { RecordDemoVisitUseCase } from '../application/RecordDemoVisitUseCase';
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
