import express, { type Express, type RequestHandler } from 'express';
import request from 'supertest';
import { ErrorHandler } from '@/shared/presentation/ErrorHandler';
import type { Actor } from '@/modules/ApiKey/domain/Actor';
import {
  requireMethodPermission,
  requireStaff,
  setRequestActor,
} from '@/modules/ApiKey/presentation/actorMiddleware';
import { CreateTenantUseCase } from '@/modules/Tenant/application/CreateTenantUseCase';
import { PlatformDomainConfig } from '@/modules/Tenant/application/ManageTenantUseCase';
import type { SiteContentSource } from '@/modules/Tenant/domain/SiteContentSource';
import type { TenantRepository } from '@/modules/Tenant/domain/TenantRepository';
import { RecordActivityUseCase } from '@/modules/ActivityLog/application/RecordActivityUseCase';
import type { ActivityLogRepository } from '@/modules/ActivityLog/domain/ActivityLogRepository';
import { EMPTY_SITE_CONTENT } from '@/modules/Tenant/domain/SiteContent';
import { CreateDemoUseCase } from '../application/CreateDemoUseCase';
import { QueryDemosUseCase } from '../application/QueryDemosUseCase';
import { UpdateProspectUseCase } from '../application/UpdateProspectUseCase';
import { RegenerateDemoLinkUseCase } from '../application/RegenerateDemoLinkUseCase';
import { ManageDemoExpiryUseCase } from '../application/ManageDemoExpiryUseCase';
import { PurgeDemoUseCase } from '../application/PurgeDemoUseCase';
import { DiscardDemoUseCase } from '../application/DiscardDemoUseCase';
import type { SiteCacheInvalidator } from '@/modules/SiteCache/domain/SiteCacheInvalidator';
import type { StorageProvider } from '@/modules/FileStorage/domain/StorageProvider';
import { Demo, type DemoOutcome } from '../domain/Demo';
import { DemoLifecycleConfig } from '../domain/DemoLifecycleConfig';
import type { DemoRepository, DemoView } from '../domain/DemoRepository';
import { Prospect } from '../domain/Prospect';
import { DemoVisit } from '../domain/DemoVisit';
import { AdminDemoController } from './AdminDemoController';
import { createAdminDemoRouter } from './adminDemoRouter';

describe('AdminDemoController (HTTP)', () => {
  const DEMO_ID = '018f6f1a-0000-7000-8000-0000000000d1';
  const TENANT_ID = '018f6f1a-0000-7000-8000-0000000000e1';
  const PROSPECT_ID = '018f6f1a-0000-7000-8000-0000000000f1';
  const NOW = new Date('2026-09-26T12:00:00Z');

  const staff: Actor = {
    type: 'admin',
    id: '018f6f1a-0000-7000-8000-0000000000a1',
    name: 'Pau',
    permission: 'full',
    role: 'editor',
    tenantScope: null,
    rateLimitPerMinute: null,
  };
  const client: Actor = {
    ...staff,
    id: '018f6f1a-0000-7000-8000-0000000000a2',
    role: 'client',
    permission: 'write',
    tenantScope: [TENANT_ID],
  };
  const readKey: Actor = {
    ...staff,
    type: 'apiKey',
    id: '018f6f1a-0000-7000-8000-0000000000a3',
    name: 'Agente lector',
    role: null,
    permission: 'read',
  };
  const writeKey: Actor = { ...readKey, name: 'Agente', permission: 'write' };
  const fullKey: Actor = { ...readKey, name: 'Agente total', permission: 'full' };
  const owner: Actor = {
    ...staff,
    id: '018f6f1a-0000-7000-8000-0000000000a4',
    role: 'owner',
  };
  const scopedKey: Actor = { ...writeKey, tenantScope: [TENANT_ID] };

  const prospect = new Prospect(
    PROSPECT_ID,
    'Pastelería Luna',
    'Luna',
    null,
    null,
    'pastelería',
    null,
    null,
    NOW,
    NOW,
  );
  const FAR_EXPIRY = new Date('2099-01-01T00:00:00Z');
  const buildDemo = (
    expiresAt: Date | null = FAR_EXPIRY,
    outcome: DemoOutcome | null = null,
    extensionCount = 0,
  ): Demo =>
    new Demo(
      DEMO_ID,
      TENANT_ID,
      PROSPECT_ID,
      null,
      'pastelería',
      { type: 'admin', id: staff.id, name: 'Pau' },
      NOW,
      expiresAt,
      outcome,
      outcome === null ? null : NOW,
      { count: 0, firstAt: null, lastAt: null },
      null,
      extensionCount,
    );
  const view: DemoView = {
    demo: buildDemo(),
    site: {
      tenantId: TENANT_ID,
      slug: 'demo-pasteleria-luna',
      name: 'Pastelería Luna',
      address: 'demo-pasteleria-luna.webbuilder.co',
    },
    prospect: {
      id: PROSPECT_ID,
      businessName: 'Pastelería Luna',
      contactName: 'Luna',
      phone: '+56 9 1234 5678',
      hasEmail: false,
    },
  };

  const buildRepository = (): jest.Mocked<DemoRepository> => ({
    create: jest.fn().mockResolvedValue(DEMO_ID),
    isAddressTaken: jest.fn().mockResolvedValue(false),
    findById: jest.fn().mockResolvedValue(view),
    findDemo: jest.fn().mockResolvedValue(view.demo),
    updateExpiry: jest.fn().mockResolvedValue(true),
    list: jest.fn().mockResolvedValue([view]),
    findProspect: jest.fn().mockResolvedValue(prospect),
    updateProspect: jest.fn().mockResolvedValue(prospect),
    replaceAccessToken: jest.fn(),
    findAccess: jest.fn(),
    recordVisit: jest.fn(),
    listVisits: jest.fn(),
    findExpiryWarningCandidates: jest.fn(),
    markExpiryWarningSent: jest.fn(),
    markExpiryWarningFailed: jest.fn(),
    findDueForPurge: jest.fn(),
    purge: jest.fn(),
    findPendingFiles: jest.fn(),
    resolvePendingFile: jest.fn(),
    failPendingFile: jest.fn(),
    discard: jest.fn().mockResolvedValue(true),
    restore: jest.fn().mockResolvedValue(true),
  });

  interface Collaborators {
    readonly cache: jest.Mocked<SiteCacheInvalidator>;
  }

  const build = (
    actor: Actor,
    repository = buildRepository(),
  ): {
    app: Express;
    repository: jest.Mocked<DemoRepository>;
    logs: jest.Mock;
    storage: jest.Mocked<StorageProvider>;
  } & Collaborators => {
    const logs = jest.fn().mockResolvedValue(undefined);
    const activity = new RecordActivityUseCase({
      record: logs,
    } as unknown as ActivityLogRepository);
    const source: SiteContentSource = {
      fromTemplate: jest.fn().mockResolvedValue(EMPTY_SITE_CONTENT),
      listTemplates: jest.fn().mockResolvedValue([]),
    };
    const platform = new PlatformDomainConfig('webbuilder.co', 'sitios.webbuilder.co');
    const config = new DemoLifecycleConfig();
    const storage = {
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<StorageProvider>;
    const cache = { invalidate: jest.fn().mockResolvedValue(undefined) };
    const controller = new AdminDemoController(
      new CreateDemoUseCase(
        repository,
        new CreateTenantUseCase({} as TenantRepository, source, platform),
        source,
        platform,
        activity,
        config,
      ),
      new QueryDemosUseCase(repository, config),
      new UpdateProspectUseCase(repository, activity),
      new RegenerateDemoLinkUseCase(repository, activity),
      new ManageDemoExpiryUseCase(repository, config, activity),
      new PurgeDemoUseCase(repository, storage, activity),
      new DiscardDemoUseCase(repository, config, cache, activity),
    );
    const fakeActor: RequestHandler = (_req, res, next) => {
      setRequestActor(res, actor);
      next();
    };
    const app = express();
    app.use(express.json());
    // Mismo montaje que app.ts.
    app.use(
      '/api/admin/demos',
      fakeActor,
      requireStaff,
      requireMethodPermission,
      createAdminDemoRouter(controller),
    );
    app.use(new ErrorHandler().handle);
    return { app, repository, logs, storage, cache };
  };

  const body = {
    slug: 'pasteleria-luna',
    name: 'Pastelería Luna',
    prospect: { businessName: 'Pastelería Luna', phone: '+56 9 1234 5678' },
  };

  it('crea la demo y devuelve los dos enlaces en claro', async () => {
    const { app } = build(staff);

    const response = await request(app).post('/api/admin/demos').send(body);

    expect(response.status).toBe(201);
    const payload = response.body as {
      demo: { id: string; status: string; site: { address: string } };
      prospect: { businessName: string };
      links: Record<'prospect' | 'team', { url: string; token: string }>;
    };
    expect(payload.demo.status).toBe('vigente');
    expect(payload.demo.site.address).toBe('demo-pasteleria-luna.webbuilder.co');
    expect(payload.links.prospect.url).toMatch(
      /^https:\/\/demo-pasteleria-luna\.webbuilder\.co\/demo\/demo_[0-9a-f]{64}$/,
    );
    expect(payload.links.team.token).toMatch(/^demo_[0-9a-f]{64}$/);
  });

  it('ninguna otra respuesta vuelve a mostrar los enlaces', async () => {
    const { app } = build(staff);

    const [list, detail] = await Promise.all([
      request(app).get('/api/admin/demos'),
      request(app).get(`/api/admin/demos/${DEMO_ID}`),
    ]);

    expect(list.status).toBe(200);
    expect(detail.status).toBe(200);
    expect(JSON.stringify(list.body)).not.toContain('demo_');
    expect(JSON.stringify(detail.body)).not.toMatch(/"(token|url|links)"/);
  });

  it('responde 409 con el siguiente slug libre', async () => {
    const repository = buildRepository();
    repository.isAddressTaken.mockImplementation((slug: string) =>
      Promise.resolve(slug === 'demo-pasteleria-luna'),
    );
    const { app } = build(staff, repository);

    const response = await request(app).post('/api/admin/demos').send(body);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'Conflict',
      message: expect.stringContaining('pasteleria-luna-2') as unknown,
      suggestedSlug: 'pasteleria-luna-2',
    });
  });

  it('filtra el listado por estado, prospecto y quién la creó', async () => {
    const { app, repository } = build(staff);

    await request(app).get(
      `/api/admin/demos?status=vencida&prospectId=${PROSPECT_ID}&createdBy=${staff.id}`,
    );

    expect(repository.list).toHaveBeenCalledWith(
      { status: 'vencida', prospectId: PROSPECT_ID, createdBy: staff.id },
      expect.any(Date),
    );
  });

  it('el detalle trae el prospecto y sus otras demos', async () => {
    const repository = buildRepository();
    const other: DemoView = {
      ...view,
      demo: new Demo(
        '018f6f1a-0000-7000-8000-0000000000d2',
        '018f6f1a-0000-7000-8000-0000000000e2',
        PROSPECT_ID,
        null,
        null,
        view.demo.creator,
        NOW,
        null,
        null,
        null,
        view.demo.visits,
        null,
      ),
    };
    repository.list.mockResolvedValue([view, other]);
    const { app } = build(staff, repository);

    const response = await request(app).get(`/api/admin/demos/${DEMO_ID}`);

    const payload = response.body as {
      prospect: { id: string };
      otherDemos: { id: string }[];
    };
    expect(payload.prospect.id).toBe(PROSPECT_ID);
    expect(payload.otherDemos.map((demo) => demo.id)).toEqual([
      '018f6f1a-0000-7000-8000-0000000000d2',
    ]);
  });

  it('edita la ficha del prospecto y lo deja en el registro de actividad', async () => {
    const { app, repository, logs } = build(staff);

    const response = await request(app)
      .patch(`/api/admin/demos/${DEMO_ID}/prospect`)
      .send({ notes: 'Le gustó el diseño' });

    expect(response.status).toBe(200);
    expect(repository.updateProspect).toHaveBeenCalledWith(PROSPECT_ID, {
      notes: 'Le gustó el diseño',
    });
    expect(logs).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'demo.prospect.update',
        actorName: 'Pau',
        actorId: staff.id,
      }),
    );
  });

  it.each([
    ['crear', 'post', '/api/admin/demos'],
    ['listar', 'get', '/api/admin/demos'],
    ['ver', 'get', `/api/admin/demos/${DEMO_ID}`],
  ] as const)('un usuario client no puede %s demos', async (_label, method, path) => {
    const { app, repository } = build(client);

    const response = await request(app)[method](path).send(body);

    expect(response.status).toBe(403);
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.list).not.toHaveBeenCalled();
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('una clave de solo lectura lista pero no crea ni edita', async () => {
    const { app } = build(readKey);

    const [list, create, patch] = await Promise.all([
      request(app).get('/api/admin/demos'),
      request(app).post('/api/admin/demos').send(body),
      request(app).patch(`/api/admin/demos/${DEMO_ID}/prospect`).send({ notes: 'x' }),
    ]);

    expect(list.status).toBe(200);
    expect(create.status).toBe(403);
    expect(patch.status).toBe(403);
  });

  it('una clave con permiso write crea demos', async () => {
    const { app, logs } = build(writeKey);

    const response = await request(app).post('/api/admin/demos').send(body);

    expect(response.status).toBe(201);
    expect(logs).toHaveBeenCalledWith(
      expect.objectContaining({ actorType: 'apiKey', actorName: 'Agente' }),
    );
  });

  it('una clave limitada a algunos clientes no alcanza a las demos', async () => {
    const { app } = build(scopedKey);

    const response = await request(app).get('/api/admin/demos');

    expect(response.status).toBe(403);
  });

  it.each([
    ['prospect-link', 'prospect'],
    ['team-link', 'team'],
  ] as const)('POST /%s entrega el enlace nuevo una sola vez', async (path, kind) => {
    const { app, repository } = build(staff);

    const response = await request(app).post(`/api/admin/demos/${DEMO_ID}/${path}`);

    expect(response.status).toBe(201);
    const { link } = response.body as { link: { kind: string; url: string } };
    expect(link.kind).toBe(kind);
    expect(link.url).toMatch(
      /^https:\/\/demo-pasteleria-luna\.webbuilder\.co\/demo\/demo_/,
    );
    expect(repository.replaceAccessToken).toHaveBeenCalledWith(
      DEMO_ID,
      kind,
      expect.stringMatching(/^[0-9a-f]{64}$/),
    );
  });

  it('una clave de solo lectura no regenera enlaces', async () => {
    const { app, repository } = build(readKey);

    const response = await request(app).post(`/api/admin/demos/${DEMO_ID}/team-link`);

    expect(response.status).toBe(403);
    expect(repository.replaceAccessToken).not.toHaveBeenCalled();
  });

  it('lista las visitas paginadas, lo más reciente primero, sin la huella de la IP', async () => {
    const repository = buildRepository();
    repository.listVisits.mockResolvedValue({
      visits: [
        new DemoVisit(
          '018f6f1a-0000-7000-8000-0000000000b2',
          'precios',
          new Date('2026-09-26T13:00:00Z'),
          'huella',
          'Mozilla/5.0 (iPhone)',
        ),
      ],
      total: 3,
    });
    const { app } = build(staff, repository);

    const response = await request(app).get(
      `/api/admin/demos/${DEMO_ID}/visits?page=1&perPage=1`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      visits: [
        {
          id: '018f6f1a-0000-7000-8000-0000000000b2',
          pageSlug: 'precios',
          visitedAt: '2026-09-26T13:00:00.000Z',
          userAgent: 'Mozilla/5.0 (iPhone)',
        },
      ],
      total: 3,
      page: 1,
      perPage: 1,
    });
    expect(repository.listVisits).toHaveBeenCalledWith(DEMO_ID, 1, 1);
  });

  it('un usuario client no puede ver las visitas de ninguna demo', async () => {
    const { app, repository } = build(client);

    const response = await request(app).get(`/api/admin/demos/${DEMO_ID}/visits`);

    expect(response.status).toBe(403);
    expect(repository.listVisits).not.toHaveBeenCalled();
  });

  describe('vencimiento', () => {
    it('extender suma 14 días al vencimiento y cuenta la extensión', async () => {
      const { app, repository, logs } = build(staff);

      const response = await request(app).post(`/api/admin/demos/${DEMO_ID}/extend`);

      expect(response.status).toBe(200);
      expect(repository.updateExpiry).toHaveBeenCalledWith(DEMO_ID, FAR_EXPIRY, {
        expiresAt: new Date('2099-01-15T00:00:00Z'),
        extensionCount: 1,
      });
      expect(logs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'demo.extend',
          entityId: DEMO_ID,
          tenantId: TENANT_ID,
          before: { expiresAt: '2099-01-01T00:00:00.000Z', extensionCount: 0 },
          after: { expiresAt: '2099-01-15T00:00:00.000Z', extensionCount: 1 },
        }),
      );
    });

    it('una clave con write extiende; una de solo lectura no', async () => {
      const [write, read] = await Promise.all([
        request(build(writeKey).app).post(`/api/admin/demos/${DEMO_ID}/extend`),
        request(build(readKey).app).post(`/api/admin/demos/${DEMO_ID}/extend`),
      ]);

      expect(write.status).toBe(200);
      expect(read.status).toBe(403);
    });

    it.each([
      ['convertida', 'converted'],
      ['descartada', 'discarded'],
    ] as const)('no extiende una demo %s (422)', async (_label, outcome) => {
      const repository = buildRepository();
      repository.findDemo.mockResolvedValue(buildDemo(FAR_EXPIRY, outcome));
      const { app } = build(staff, repository);

      const [extend, expiry] = await Promise.all([
        request(app).post(`/api/admin/demos/${DEMO_ID}/extend`),
        request(app)
          .patch(`/api/admin/demos/${DEMO_ID}/expiry`)
          .send({ neverExpires: true }),
      ]);

      expect(extend.status).toBe(422);
      expect(expiry.status).toBe(422);
      expect(repository.updateExpiry).not.toHaveBeenCalled();
    });

    it('si otra petición cambió el vencimiento a la vez, responde 409', async () => {
      const repository = buildRepository();
      repository.updateExpiry.mockResolvedValue(false);
      const { app } = build(staff, repository);

      const response = await request(app).post(`/api/admin/demos/${DEMO_ID}/extend`);

      expect(response.status).toBe(409);
    });

    it('marcarla sin vencimiento le quita la fecha y queda registrado', async () => {
      const { app, repository, logs } = build(staff);

      const response = await request(app)
        .patch(`/api/admin/demos/${DEMO_ID}/expiry`)
        .send({ neverExpires: true });

      expect(response.status).toBe(200);
      expect(repository.updateExpiry).toHaveBeenCalledWith(DEMO_ID, FAR_EXPIRY, {
        expiresAt: null,
        extensionCount: 0,
      });
      expect(logs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'demo.expiry.update',
          before: { expiresAt: '2099-01-01T00:00:00.000Z' },
          after: { expiresAt: null },
        }),
      );
    });

    it('rechaza un cuerpo sin neverExpires booleano', async () => {
      const { app, repository } = build(staff);

      const response = await request(app)
        .patch(`/api/admin/demos/${DEMO_ID}/expiry`)
        .send({ neverExpires: 'si' });

      expect(response.status).toBe(400);
      expect(repository.updateExpiry).not.toHaveBeenCalled();
    });

    it('la respuesta dice si vence y cuántas veces se extendió', async () => {
      const repository = buildRepository();
      repository.findById.mockResolvedValue({ ...view, demo: buildDemo(null, null, 2) });
      const { app } = build(staff, repository);

      const response = await request(app).get(`/api/admin/demos/${DEMO_ID}`);

      expect(response.body).toMatchObject({
        demo: { expiresAt: null, neverExpires: true, extensionCount: 2 },
      });
    });

    it('"por vencer" pide las vigentes que vencen en los próximos 3 días', async () => {
      const { app, repository } = build(staff);
      const before = Date.now();

      const response = await request(app).get('/api/admin/demos?status=por-vencer');

      expect(response.status).toBe(200);
      const [filter] = repository.list.mock.calls[0] ?? [];
      expect(filter?.status).toBe('vigente');
      const until = filter?.expiresBefore?.getTime() ?? 0;
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      expect(until).toBeGreaterThanOrEqual(before + threeDays);
      expect(until).toBeLessThanOrEqual(Date.now() + threeDays);
    });
  });

  describe('borrar', () => {
    const purged = new Demo(
      DEMO_ID,
      null,
      null,
      null,
      'pastelería',
      { type: 'admin', id: staff.id, name: 'Pau' },
      NOW,
      FAR_EXPIRY,
      null,
      null,
      { count: 3, firstAt: NOW, lastAt: NOW },
      NOW,
    );
    const withPurge = (): jest.Mocked<DemoRepository> => {
      const repository = buildRepository();
      repository.purge.mockResolvedValue({
        demo: purged,
        pendingFileKeys: ['018f6f1a-0000-7000-8000-0000000000b1.png'],
        prospectDeleted: true,
      });
      return repository;
    };
    const remove = (app: Express, body: object = { confirm: true }): request.Test =>
      request(app).delete(`/api/admin/demos/${DEMO_ID}`).send(body);

    it('el owner la borra al instante con confirmación y queda el registro anónimo', async () => {
      const { app, repository, logs, storage } = build(owner, withPurge());

      const response = await remove(app);

      expect(response.status).toBe(200);
      expect(repository.purge).toHaveBeenCalledWith(DEMO_ID, expect.any(Date), undefined);
      expect(storage.delete).toHaveBeenCalledWith(
        '018f6f1a-0000-7000-8000-0000000000b1.png',
      );
      expect(response.body).toMatchObject({
        demo: {
          id: DEMO_ID,
          status: 'borrada',
          tenantId: null,
          prospectId: null,
          visits: { count: 3 },
        },
        files: { deleted: 1, pending: 0 },
        prospectDeleted: true,
      });
      // El registro sobrevive a la demo: sin tenant ni nombre del negocio.
      expect(logs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'demo.delete',
          tenantId: null,
          entityId: DEMO_ID,
        }),
      );
      expect(JSON.stringify(logs.mock.calls)).not.toContain('Pastelería');
    });

    it('una clave full también borra', async () => {
      const { app } = build(fullKey, withPurge());

      expect((await remove(app)).status).toBe(200);
    });

    it.each([
      ['un editor', staff],
      ['una clave con write', writeKey],
      ['un usuario client', client],
    ])('%s recibe 403', async (_label, actor) => {
      const { app, repository } = build(actor, withPurge());

      const response = await remove(app);

      expect(response.status).toBe(403);
      expect(repository.purge).not.toHaveBeenCalled();
    });

    it('sin { confirm: true } no borra nada', async () => {
      const { app, repository } = build(owner, withPurge());

      const [none, no] = await Promise.all([
        request(app).delete(`/api/admin/demos/${DEMO_ID}`),
        remove(app, { confirm: false }),
      ]);

      expect(none.status).toBe(400);
      expect(no.status).toBe(400);
      expect(repository.purge).not.toHaveBeenCalled();
    });

    it('una demo convertida no se borra: 422', async () => {
      const repository = withPurge();
      repository.findDemo.mockResolvedValue(buildDemo(FAR_EXPIRY, 'converted'));
      const { app } = build(owner, repository);

      const response = await remove(app);

      expect(response.status).toBe(422);
      expect(repository.purge).not.toHaveBeenCalled();
    });

    it('una demo que no existe: 404', async () => {
      const repository = withPurge();
      repository.findDemo.mockResolvedValue(null);
      const { app } = build(owner, repository);

      expect((await remove(app)).status).toBe(404);
    });
  });
  describe('descartar y recuperar', () => {
    const discardedDemo = buildDemo(FAR_EXPIRY, 'discarded');
    const withDiscarded = (demo: Demo = discardedDemo): jest.Mocked<DemoRepository> => {
      const repository = buildRepository();
      repository.findDemo.mockResolvedValue(demo);
      return repository;
    };
    const discard = (app: Express, payload: object = {}): request.Test =>
      request(app).post(`/api/admin/demos/${DEMO_ID}/discard`).send(payload);
    const restore = (app: Express): request.Test =>
      request(app).post(`/api/admin/demos/${DEMO_ID}/restore`);

    it('un editor descarta con motivo y queda en el registro de actividad', async () => {
      const repository = buildRepository();
      repository.findById.mockResolvedValue({ ...view, demo: discardedDemo });
      const { app, logs, cache } = build(staff, repository);

      const response = await discard(app, { reason: 'precio' });

      expect(response.status).toBe(200);
      expect(repository.discard).toHaveBeenCalledWith(
        DEMO_ID,
        'precio',
        expect.any(Date),
      );
      expect((response.body as { demo: { status: string } }).demo.status).toBe(
        'descartada',
      );
      expect(cache.invalidate).toHaveBeenCalledWith([
        'demo-pasteleria-luna.webbuilder.co',
      ]);
      expect(logs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'demo.discard',
          tenantId: TENANT_ID,
          after: expect.objectContaining({ reason: 'precio' }) as unknown,
        }),
      );
    });

    it('el motivo es opcional pero de una lista cerrada', async () => {
      const { app, repository } = build(staff);

      const [none, other] = [await discard(app), await discard(app, { reason: 'caro' })];

      expect(none.status).toBe(200);
      expect(repository.discard).toHaveBeenCalledWith(DEMO_ID, null, expect.any(Date));
      expect(other.status).toBe(400);
    });

    it('descartar dos veces no cambia nada la segunda vez', async () => {
      const { app, repository, logs } = build(staff, withDiscarded());

      const response = await discard(app, { reason: 'otro' });

      expect(response.status).toBe(200);
      expect(repository.discard).not.toHaveBeenCalled();
      expect(logs).not.toHaveBeenCalled();
    });

    it('si otro descarte gana la carrera, responde igual sin registrar dos veces', async () => {
      const repository = buildRepository();
      repository.discard.mockResolvedValue(false);
      repository.findDemo
        .mockResolvedValueOnce(buildDemo())
        .mockResolvedValue(discardedDemo);
      const { app, logs } = build(staff, repository);

      expect((await discard(app)).status).toBe(200);
      expect(logs).not.toHaveBeenCalled();
    });

    it('descartar una demo convertida responde 422', async () => {
      const { app, repository } = build(
        staff,
        withDiscarded(buildDemo(null, 'converted')),
      );

      expect((await discard(app)).status).toBe(422);
      expect(repository.discard).not.toHaveBeenCalled();
    });

    it('recuperar una descartada la deja vigente 14 días desde hoy', async () => {
      const repository = withDiscarded();
      const { app, logs } = build(staff, repository);
      const before = Date.now();

      const response = await restore(app);

      expect(response.status).toBe(200);
      const [id, discardedAt, expiresAt] = repository.restore.mock.calls[0] ?? [];
      expect(id).toBe(DEMO_ID);
      expect(discardedAt).toEqual(NOW);
      const fourteenDays = 14 * 24 * 60 * 60 * 1000;
      expect(expiresAt?.getTime()).toBeGreaterThanOrEqual(before + fourteenDays);
      expect(expiresAt?.getTime()).toBeLessThanOrEqual(Date.now() + fourteenDays);
      expect(logs).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'demo.restore', entityId: DEMO_ID }),
      );
    });

    it('pasado el período de gracia ya no se recupera', async () => {
      const old = new Demo(
        DEMO_ID,
        TENANT_ID,
        PROSPECT_ID,
        null,
        null,
        { type: 'admin', id: null, name: 'Pau' },
        NOW,
        FAR_EXPIRY,
        'discarded',
        new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        { count: 0, firstAt: null, lastAt: null },
        null,
      );
      const { app, repository } = build(staff, withDiscarded(old));

      const response = await restore(app);

      expect(response.status).toBe(422);
      expect((response.body as { message: string }).message).toContain('30 días');
      expect(repository.restore).not.toHaveBeenCalled();
    });

    it.each([
      ['vigente', buildDemo()],
      ['convertida', buildDemo(null, 'converted')],
    ])('recuperar una demo %s responde 422', async (_label, demo) => {
      const { app, repository } = build(staff, withDiscarded(demo));

      expect((await restore(app)).status).toBe(422);
      expect(repository.restore).not.toHaveBeenCalled();
    });

    it('si otra petición la cambió a la vez, responde 409', async () => {
      const repository = withDiscarded();
      repository.restore.mockResolvedValue(false);
      const { app } = build(staff, repository);

      expect((await restore(app)).status).toBe(409);
    });

    it.each([
      ['un editor', staff, 200, 200],
      ['una clave full', fullKey, 200, 200],
      ['una clave write', writeKey, 403, 200],
      ['una clave de solo lectura', readKey, 403, 403],
      ['un usuario client', client, 403, 403],
    ])('%s: descartar %i, recuperar %i', async (_label, actor, onDiscard, onRestore) => {
      const { app: discardApp } = build(actor);
      const { app: restoreApp } = build(actor, withDiscarded());

      expect((await discard(discardApp)).status).toBe(onDiscard);
      expect((await restore(restoreApp)).status).toBe(onRestore);
    });

    it('un editor descarta y recupera, pero no borra', async () => {
      const { app } = build(staff, withDiscarded());

      const response = await request(app)
        .delete(`/api/admin/demos/${DEMO_ID}`)
        .send({ confirm: true });

      expect(response.status).toBe(403);
      expect((response.body as { message: string }).message).toContain('descártala');
    });
  });
});
