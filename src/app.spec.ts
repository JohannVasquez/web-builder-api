/* eslint-disable @typescript-eslint/no-explicit-any */
 
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import type { Express, RequestHandler } from 'express';
import request from 'supertest';
import { buildApp, type AppControllers } from './app';
import { UnauthorizedError } from './shared/domain/UnauthorizedError';
import { setRequestActor } from './modules/ApiKey/presentation/actorMiddleware';
import { Tenant } from './modules/Tenant/domain/Tenant';

// Prueba de cableado: el bug de SPEC 0.1 estaba en el montaje, no en un controller.
describe('buildApp (rutas protegidas)', () => {
  const noop: RequestHandler = (_req, _res, next) => next();

  // Las rutas públicas pasan por `siteAvailability`, que necesita un tenant resuelto.
  const fakeTenantResolver: RequestHandler = (_req, res, next) => {
    (res.locals as { tenant?: Tenant }).tenant = new Tenant(
      '018f6f1a-0000-7000-8000-000000000001',
      'demo',
      'Demo',
      null,
    );
    next();
  };

  const buildControllers = (): AppControllers => {
    const ok =
      (status: number): RequestHandler =>
      (_req, res) => {
        res.status(status).json({ ok: true });
      };
    return {
      pageController: { getBySlug: ok(200), listPublished: ok(200) },
      globalSettingsController: { get: ok(200) },
      navigationController: { get: ok(200) },
      contactController: { send: ok(200) },
      fileController: { upload: ok(201), remove: ok(204) },
      tenantController: { checkDomainAllowed: ok(200) },
      authController: {
        login: ok(200),
        me: ok(200),
        forgotPassword: ok(200),
        resetPassword: ok(200),
      },
      adminTenantController: {
        list: ok(200),
        create: ok(201),
        listTemplates: ok(200),
        changeStatus: ok(200),
        listDomains: ok(200),
        addDomain: ok(201),
        verifyDomain: ok(200),
        setPrimaryDomain: ok(200),
        removeDomain: ok(204),
      },
      adminNavigationController: { list: ok(200), replace: ok(200) },
      checkoutController: {
        settings: ok(200),
        quote: ok(200),
        checkout: ok(201),
        confirm: ok(200),
      },
      adminPreviewLinkController: {
        generate: ok(201),
        revoke: ok(204),
      },
      adminOrderController: {
        listOrders: ok(200),
        getOrder: ok(200),
        changeOrderStatus: ok(200),
        retryConfirmation: ok(200),
        report: ok(200),
        getSettings: ok(200),
        saveSettings: ok(200),
        listCoupons: ok(200),
        createCoupon: ok(201),
        updateCoupon: ok(200),
        removeCoupon: ok(204),
      },
      adminUserController: {
        list: ok(200),
        invite: ok(201),
        changeRole: ok(200),
        setDisabled: ok(200),
      },
      apiKeyController: {
        list: ok(200),
        create: ok(201),
        revoke: ok(200),
        regenerate: ok(201),
      },
      activityLogController: { list: ok(200) },
      catalogController: { get: ok(200) },
      legalPageController: { list: ok(200), create: ok(201) },
      newsletterController: {
        subscribe: ok(200),
        unsubscribe: ok(200),
        list: ok(200),
        exportCsv: ok(200),
      },
      dataRightsController: {
        submit: ok(202),
        verify: ok(200),
        list: ok(200),
        resolve: ok(204),
      },
      mediaProxyController: { get: ok(307) },
      consumerClaimController: { submit: ok(201), list: ok(200), resolve: ok(204) },
      redirectController: {
        resolve: ok(200),
        list: ok(200),
        create: ok(201),
        remove: ok(204),
      },
      consentController: { record: ok(201), current: ok(200) },
      mediaController: {
        list: ok(200),
        upload: ok(201),
        describe: ok(200),
        remove: ok(200),
      },
      blogController: { list: ok(200), get: ok(200) },
      storeController: {
        list: ok(200),
        featured: ok(200),
        get: ok(200),
        categories: ok(200),
      },
      adminStoreController: {
        list: ok(200),
        get: ok(200),
        create: ok(201),
        update: ok(200),
        remove: ok(204),
        listCategories: ok(200),
        createCategory: ok(201),
        updateCategory: ok(200),
        removeCategory: ok(204),
      },
      adminBlogController: {
        list: ok(200),
        get: ok(200),
        create: ok(201),
        update: ok(200),
        remove: ok(204),
      },
      adminContactMessageController: {
        list: ok(200),
        markRead: ok(200),
        exportCsv: ok(200),
      },
      adminGlobalSettingsController: { get: ok(200), update: ok(200) },
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
        duplicateSection: ok(201),
        deleteSection: ok(204),
        reorderSections: ok(200),
        publish: ok(200),
        listVersions: ok(200),
        restoreVersion: ok(200),
      },
      adminSignedDocumentController: { register: ok(201), listOutdated: ok(200), listByTenant: ok(200) } as any,
      adminSubscriptionController: { statusAction: ok(200), updateAction: ok(200), registerPaymentAction: ok(200), overviewAction: ok(200), exportAction: ok(200) },
      adminSiteQualityReviewController: {
        review: ok(200),
      },
    } as unknown as AppControllers;
  };

  // Acepta `Bearer valido` y rechaza el resto, como el middleware de actor real.
  const fakeActor: RequestHandler = (req, res, next) => {
    if (req.headers.authorization !== 'Bearer valido') {
      next(new UnauthorizedError('Falta el token de autenticación'));
      return;
    }
    setRequestActor(res, {
      type: 'admin',
      id: '018f6f1a-0000-7000-8000-000000000001',
      name: 'Admin',
      role: 'owner',
      permission: 'full',
      tenantScope: null,
      rateLimitPerMinute: null,
    });
    next();
  };

  const app = (): Express =>
    buildApp(buildControllers(), ['*'], noop, fakeTenantResolver, fakeActor, noop, noop, noop);

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

  it('rechaza consultar la actividad sin token', async () => {
    const response = await request(app()).get('/api/admin/activity');

    expect(response.status).toBe(401);
  });

  it('rechaza listar claves de acceso sin token', async () => {
    const response = await request(app()).get('/api/admin/api-keys');

    expect(response.status).toBe(401);
  });

  it('rechaza consultar el catálogo sin token', async () => {
    const response = await request(app()).get('/api/admin/catalog');

    expect(response.status).toBe(401);
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

  describe('health', () => {
    it('responde 200 ok si la base de datos y el storage responden', async () => {
      const server = buildApp(buildControllers(), ['*'], noop, fakeTenantResolver, fakeActor, noop, noop, noop, noop, () => Promise.resolve());

      const res = await request(server).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('responde 503 error si falla el healthCheck', async () => {
      const server = buildApp(buildControllers(), ['*'], noop, fakeTenantResolver, fakeActor, noop, noop, noop, noop, () => Promise.reject(new Error('Timeout de base de datos')));

      const res = await request(server).get('/health');
      expect(res.status).toBe(503);
      expect((res.body as { status: string }).status).toBe('error');
    });
  });
});
