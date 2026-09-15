import type { Express, RequestHandler } from 'express';
import request from 'supertest';
import { buildApp, type AppControllers } from './app';
import { UnauthorizedError } from './shared/domain/UnauthorizedError';

// Prueba de cableado: el bug de SPEC 0.1 estaba en el montaje, no en un controller.
describe('buildApp (rutas protegidas)', () => {
  const noop: RequestHandler = (_req, _res, next) => next();

  const buildControllers = (): AppControllers => {
    const ok =
      (status: number): RequestHandler =>
      (_req, res) => {
        res.status(status).json({ ok: true });
      };
    return {
      pageController: { getBySlug: ok(200) },
      globalSettingsController: { get: ok(200) },
      navigationController: { get: ok(200) },
      contactController: { send: ok(200) },
      fileController: { upload: ok(201), remove: ok(204) },
      tenantController: { checkDomainAllowed: ok(200) },
      authController: { login: ok(200), me: ok(200) },
      adminTenantController: { list: ok(200) },
      adminBrandController: {
        get: ok(200),
        update: ok(200),
        listFontPairings: ok(200),
      },
      adminPageController: {
        list: ok(200),
        get: ok(200),
        create: ok(201),
        update: ok(200),
        remove: ok(204),
        addSection: ok(201),
        updateSection: ok(200),
        deleteSection: ok(204),
        reorderSections: ok(200),
      },
    } as unknown as AppControllers;
  };

  // Acepta `Bearer valido` y rechaza el resto, como el middleware real.
  const fakeAdminAuth: RequestHandler = (req, _res, next) => {
    if (req.headers.authorization !== 'Bearer valido') {
      next(new UnauthorizedError('Falta el token de autenticación'));
      return;
    }
    next();
  };

  const app = (): Express =>
    buildApp(buildControllers(), ['*'], noop, noop, fakeAdminAuth, noop);

  it('rechaza subir un archivo sin sesión de administración', async () => {
    const response = await request(app()).post('/api/files');

    expect(response.status).toBe(401);
    const body = response.body as { error: string; message: string };
    expect(body.error).toBe('Unauthorized');
    expect(body.message).toContain('token');
  });

  it('rechaza borrar un archivo sin sesión de administración', async () => {
    const response = await request(app()).delete('/api/files/alguna-key');

    expect(response.status).toBe(401);
  });

  it('rechaza una sesión inválida con 401, no con 500', async () => {
    const response = await request(app())
      .post('/api/files')
      .set('Authorization', 'Bearer caducado');

    expect(response.status).toBe(401);
  });

  it('deja subir y borrar archivos con sesión de administración válida', async () => {
    const uploaded = await request(app())
      .post('/api/files')
      .set('Authorization', 'Bearer valido');
    const removed = await request(app())
      .delete('/api/files/alguna-key')
      .set('Authorization', 'Bearer valido');

    expect(uploaded.status).toBe(201);
    expect(removed.status).toBe(204);
  });

  it('mantiene públicas las rutas de lectura del sitio', async () => {
    const [page, settings, navigation] = await Promise.all([
      request(app()).get('/api/pages/home'),
      request(app()).get('/api/settings'),
      request(app()).get('/api/navigation'),
    ]);

    expect(page.status).toBe(200);
    expect(settings.status).toBe(200);
    expect(navigation.status).toBe(200);
  });
});
