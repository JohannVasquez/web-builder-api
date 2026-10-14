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
import { ConvertDemoUseCase } from '../application/ConvertDemoUseCase';
import { DiscardDemoUseCase } from '../application/DiscardDemoUseCase';
import { GetDemoMetricsUseCase } from '../application/GetDemoMetricsUseCase';
import type { DemoMetricsRepository } from '../domain/DemoMetricsRepository';
import type { DemoMetricsRow } from '../domain/DemoMetrics';
import type { ManageAdminUsersUseCase } from '@/modules/Auth/application/ManageAdminUsersUseCase';
import type { AdminUserRepository } from '@/modules/Auth/domain/AdminUserRepository';
import type { PasswordHasher } from '@/modules/Auth/domain/PasswordHasher';
import type { SiteCacheInvalidator } from '@/modules/SiteCache/domain/SiteCacheInvalidator';
import type { StorageProvider } from '@/modules/FileStorage/domain/StorageProvider';
import { Demo, type DemoOutcome } from '../domain/Demo';
import { DemoLifecycleConfig } from '../domain/DemoLifecycleConfig';
import type { DemoRepository, DemoView } from '../domain/DemoRepository';
import { Prospect } from '../domain/Prospect';
import { DemoVisit } from '../domain/DemoVisit';
import { DemoAddressTakenError } from '../domain/errors';
import { AdminUser } from '@/modules/Auth/domain/AdminUser';
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
    convert: jest.fn(),
  });

  interface Collaborators {
    readonly users: jest.Mocked<Pick<AdminUserRepository, 'findByEmail'>>;
    readonly adminUsers: jest.Mocked<Pick<ManageAdminUsersUseCase, 'sendInvitation'>>;
    readonly cache: jest.Mocked<SiteCacheInvalidator>;
  }

  const buildMetricsRepository = (
    rows: DemoMetricsRow[] = [],
  ): jest.Mocked<DemoMetricsRepository> => ({
    findCreatedBetween: jest.fn().mockResolvedValue(rows),
  });

  const build = (
    actor: Actor,
    repository = buildRepository(),
    metricsRepository = buildMetricsRepository(),
  ): {
    app: Express;
    repository: jest.Mocked<DemoRepository>;
    metricsRepository: jest.Mocked<DemoMetricsRepository>;
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
    const users = { findByEmail: jest.fn().mockResolvedValue(null) };
    const adminUsers = { sendInvitation: jest.fn().mockResolvedValue(undefined) };
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
      new ConvertDemoUseCase(
        repository,
        users as unknown as AdminUserRepository,
        { hash: jest.fn().mockResolvedValue('hash') } as unknown as PasswordHasher,
        adminUsers as unknown as ManageAdminUsersUseCase,
        cache,
        platform,
        activity,
      ),
      new DiscardDemoUseCase(repository, config, cache, activity),
      new GetDemoMetricsUseCase(metricsRepository),
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
    return {
      app,
      repository,
      metricsRepository,
      logs,
      storage,
      users,
      adminUsers,
      cache,
    };
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
  describe('convertir', () => {
    const CLIENT_ID = '018f6f1a-0000-7000-8000-0000000000c1';
    const SIBLING_ID = '018f6f1a-0000-7000-8000-0000000000d2';
    const convertedDemo = buildDemo(null, 'converted');
    const convertedView: DemoView = {
      ...view,
      demo: convertedDemo,
      site: {
        tenantId: TENANT_ID,
        slug: 'pasteleria-luna',
        name: 'Pastelería Luna',
        address: 'pasteleria-luna.webbuilder.co',
      },
    };
    const withConversion = (
      owner: { created: boolean } | null = null,
      siteSlug = 'demo-pasteleria-luna',
    ): jest.Mocked<DemoRepository> => {
      const repository = buildRepository();
      repository.findById
        .mockResolvedValueOnce({
          ...view,
          site: {
            ...view.site!,
            slug: siteSlug,
            address: `${siteSlug}.webbuilder.co`,
          },
        })
        .mockResolvedValue(convertedView);
      repository.convert.mockResolvedValue({
        demo: convertedDemo,
        removedAddresses: [`${siteSlug}.webbuilder.co`],
        discardedSiblings: [
          {
            demoId: SIBLING_ID,
            tenantId: '018f6f1a-0000-7000-8000-0000000000e2',
            address: 'demo-pasteleria-luna-2.webbuilder.co',
          },
        ],
        owner:
          owner === null
            ? null
            : {
                id: CLIENT_ID,
                email: 'ana@pasteleria.cl',
                name: 'Ana Pérez',
                created: owner.created,
              },
      });
      return repository;
    };
    const convert = (app: Express, payload: object = {}): request.Test =>
      request(app).post(`/api/admin/demos/${DEMO_ID}/convert`).send(payload);

    it('pasa la demo a cliente con el slug sin demo- y descarta sus otras propuestas', async () => {
      const { app, repository, logs, cache } = build(staff, withConversion());

      const response = await convert(app);

      expect(response.status).toBe(200);
      expect(repository.convert).toHaveBeenCalledWith({
        demoId: DEMO_ID,
        slug: 'pasteleria-luna',
        address: 'pasteleria-luna.webbuilder.co',
        now: expect.any(Date) as unknown,
        owner: null,
      });
      expect(response.body).toMatchObject({
        demo: { status: 'convertida', neverExpires: true, expiresAt: null },
        tenant: {
          id: TENANT_ID,
          slug: 'pasteleria-luna',
          status: 'active',
          primaryDomain: 'pasteleria-luna.webbuilder.co',
        },
        removedAddresses: ['demo-pasteleria-luna.webbuilder.co'],
        discardedDemoIds: [SIBLING_ID],
        owner: null,
        invitation: null,
      });
      // La caché olvida la dirección vieja y la nueva.
      expect(cache.invalidate).toHaveBeenCalledWith(
        expect.arrayContaining([
          'demo-pasteleria-luna.webbuilder.co',
          'pasteleria-luna.webbuilder.co',
        ]),
      );
      expect(logs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'demo.convert',
          tenantId: TENANT_ID,
          actorName: 'Pau',
          after: expect.objectContaining({
            status: 'active',
            slug: 'pasteleria-luna',
            discardedDemoIds: [SIBLING_ID],
          }) as unknown,
        }),
      );
      expect(logs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'demo.discard',
          entityId: SIBLING_ID,
          after: expect.objectContaining({ reason: 'otra-propuesta' }) as unknown,
        }),
      );
      // Ningún enlace en la respuesta.
      expect(JSON.stringify(response.body)).not.toContain('demo_');
    });

    it('por omisión quita también el sufijo de una segunda propuesta', async () => {
      const { app, repository } = build(
        staff,
        withConversion(null, 'demo-pasteleria-luna-2'),
      );

      expect((await convert(app)).status).toBe(200);
      expect(repository.convert).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'pasteleria-luna',
          address: 'pasteleria-luna.webbuilder.co',
        }),
      );
    });

    it('usa el slug que se le indica, pero nunca uno con demo-', async () => {
      const { app, repository } = build(staff, withConversion());

      const [chosen, prefixed] = [
        await convert(app, { slug: 'luna-pasteleria' }),
        await convert(app, { slug: 'demo-luna' }),
      ];

      expect(chosen.status).toBe(200);
      expect(repository.convert).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'luna-pasteleria' }),
      );
      expect(prefixed.status).toBe(400);
    });

    it('si el slug definitivo está ocupado responde 409 con una alternativa y no cambia nada', async () => {
      const repository = withConversion();
      repository.isAddressTaken.mockImplementation((slug: string) =>
        Promise.resolve(slug === 'pasteleria-luna' || slug === 'pasteleria-luna-2'),
      );
      const { app, logs } = build(staff, repository);

      const response = await convert(app);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        error: 'Conflict',
        message: expect.stringContaining('pasteleria-luna-3') as unknown,
        suggestedSlug: 'pasteleria-luna-3',
      });
      expect(repository.convert).not.toHaveBeenCalled();
      expect(logs).not.toHaveBeenCalled();
    });

    it('si otro sitio gana la carrera por el slug dentro de la transacción, también 409', async () => {
      const repository = withConversion();
      repository.convert.mockRejectedValue(new DemoAddressTakenError('pasteleria-luna'));
      const { app } = build(staff, repository);

      const response = await convert(app);

      expect(response.status).toBe(409);
      expect((response.body as { suggestedSlug: string }).suggestedSlug).toBe(
        'pasteleria-luna-2',
      );
    });

    it('crea la cuenta del dueño y le manda la invitación después de convertir', async () => {
      const { app, repository, adminUsers } = build(
        staff,
        withConversion({ created: true }),
      );

      const response = await convert(app, {
        owner: { name: 'Ana Pérez', email: 'Ana@Pasteleria.cl' },
      });

      expect(response.status).toBe(200);
      expect(repository.convert).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: { email: 'ana@pasteleria.cl', name: 'Ana Pérez', passwordHash: 'hash' },
        }),
      );
      expect(adminUsers.sendInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ id: CLIENT_ID, email: 'ana@pasteleria.cl' }),
      );
      // La invitación sale con la transacción ya confirmada.
      expect(adminUsers.sendInvitation.mock.invocationCallOrder[0]).toBeGreaterThan(
        repository.convert.mock.invocationCallOrder[0] ?? Infinity,
      );
      expect(response.body).toMatchObject({
        owner: { id: CLIENT_ID, role: 'client', created: true },
        invitation: { status: 'sent' },
      });
    });

    it('si el correo falla, la conversión queda hecha y la respuesta lo dice', async () => {
      const { app, adminUsers } = build(staff, withConversion({ created: true }));
      adminUsers.sendInvitation.mockRejectedValue(new Error('SMTP caído'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      const response = await convert(app, {
        owner: { name: 'Ana Pérez', email: 'ana@pasteleria.cl' },
      });

      spy.mockRestore();
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        demo: { status: 'convertida' },
        invitation: {
          status: 'failed',
          message: expect.stringContaining('forgot-password') as unknown,
        },
      });
    });

    it('una cuenta de cliente que ya existía se reutiliza sin mandarle otra invitación', async () => {
      const { app, adminUsers } = build(staff, withConversion({ created: false }));

      const response = await convert(app, {
        owner: { name: 'Ana Pérez', email: 'ana@pasteleria.cl' },
      });

      expect(response.status).toBe(200);
      expect(adminUsers.sendInvitation).not.toHaveBeenCalled();
      expect(response.body).toMatchObject({
        owner: { created: false },
        invitation: { status: 'not-needed' },
      });
    });

    it.each([
      [
        'de una persona del equipo',
        new AdminUser('x', 'pau@agencia.cl', 'Pau', 'h', 'editor'),
      ],
      [
        'de una cuenta de cliente desactivada',
        new AdminUser('x', 'ana@pasteleria.cl', 'Ana', 'h', 'client', NOW),
      ],
    ])('un correo %s responde 422 antes de cambiar nada', async (_label, existing) => {
      const repository = withConversion();
      const { app, users, logs } = build(staff, repository);
      users.findByEmail.mockResolvedValue(existing);

      const response = await convert(app, {
        owner: { name: 'Pau', email: existing.email },
      });

      expect(response.status).toBe(422);
      expect(repository.convert).not.toHaveBeenCalled();
      expect(logs).not.toHaveBeenCalled();
    });

    it.each([
      ['descartada', buildDemo(FAR_EXPIRY, 'discarded')],
      ['convertida', buildDemo(null, 'converted')],
      [
        'borrada',
        new Demo(
          DEMO_ID,
          null,
          null,
          null,
          null,
          { type: 'admin', id: null, name: 'Pau' },
          NOW,
          FAR_EXPIRY,
          null,
          null,
          { count: 0, firstAt: null, lastAt: null },
          NOW,
        ),
      ],
    ])('convertir una demo %s responde 422', async (_label, demo) => {
      const repository = withConversion();
      repository.findDemo.mockResolvedValue(demo);
      const { app } = build(staff, repository);

      expect((await convert(app)).status).toBe(422);
      expect(repository.convert).not.toHaveBeenCalled();
    });

    it('una demo vencida sí se convierte', async () => {
      const repository = withConversion();
      repository.findDemo.mockResolvedValue(buildDemo(new Date('2000-01-01T00:00:00Z')));
      const { app } = build(staff, repository);

      expect((await convert(app)).status).toBe(200);
    });

    it.each([
      ['el owner', owner, 200],
      ['un editor', staff, 200],
      ['una clave full', fullKey, 200],
      ['una clave write', writeKey, 403],
      ['una clave de solo lectura', readKey, 403],
      ['un usuario client', client, 403],
      [
        'una clave limitada a algunos clientes',
        { ...fullKey, tenantScope: [TENANT_ID] },
        403,
      ],
    ])('%s: %i', async (_label, actor, status) => {
      const repository = withConversion();
      const { app } = build(actor, repository);

      expect((await convert(app)).status).toBe(status);
      if (status === 403) {
        expect(repository.convert).not.toHaveBeenCalled();
      }
    });

    it('regenerar un enlace de una demo convertida responde 422', async () => {
      const repository = buildRepository();
      repository.findById.mockResolvedValue(convertedView);
      const { app } = build(staff, repository);

      const response = await request(app).post(
        `/api/admin/demos/${DEMO_ID}/prospect-link`,
      );

      expect(response.status).toBe(422);
      expect(repository.replaceAccessToken).not.toHaveBeenCalled();
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

  describe('métricas', () => {
    const metricsRow = (overrides: Partial<DemoMetricsRow> = {}): DemoMetricsRow => ({
      industry: 'pastelería',
      templateId: 'pasteleria',
      creator: { type: 'admin', name: 'Pau' },
      createdAt: new Date('2026-03-10T15:00:00Z'),
      expiresAt: new Date('2026-03-24T15:00:00Z'),
      outcome: null,
      outcomeAt: null,
      discardReason: null,
      extensionCount: 0,
      visitCount: 0,
      firstVisitAt: null,
      purgedAt: null,
      ...overrides,
    });

    // 10 creadas, 6 abiertas y 2 convertidas; dos de ellas ya borradas.
    const tenDemos = (): DemoMetricsRow[] =>
      Array.from({ length: 10 }, (_unused, index) =>
        metricsRow({
          visitCount: index < 6 ? 2 : 0,
          firstVisitAt: index < 6 ? new Date('2026-03-11T15:00:00Z') : null,
          outcome: index < 2 ? 'converted' : null,
          outcomeAt: index < 2 ? new Date('2026-03-15T15:00:00Z') : null,
          purgedAt: index >= 8 ? new Date('2026-05-01T00:00:00Z') : null,
        }),
      );

    it('el owner ve el embudo del rango, leído en hora de Chile', async () => {
      const metricsRepository = buildMetricsRepository(tenDemos());
      const { app } = build(owner, buildRepository(), metricsRepository);

      const response = await request(app).get(
        '/api/admin/demos/metrics?from=2026-01-01&to=2026-12-31',
      );

      expect(response.status).toBe(200);
      expect(metricsRepository.findCreatedBetween).toHaveBeenCalledWith(
        new Date('2026-01-01T03:00:00.000Z'),
        new Date('2027-01-01T03:00:00.000Z'),
      );
      expect(response.body).toMatchObject({
        range: { from: '2026-01-01', to: '2026-12-31', timeZone: 'America/Santiago' },
        funnel: {
          created: 10,
          opened: 6,
          converted: 2,
          openRate: 0.6,
          conversionRate: 0.2,
          conversionRateOfOpened: 0.3333,
        },
        outcomes: { converted: 2, purged: 2 },
        groupBy: null,
        groups: [],
      });
    });

    it('agrupa con groupBy y cada grupo trae su embudo', async () => {
      const { app } = build(
        fullKey,
        buildRepository(),
        buildMetricsRepository([
          ...tenDemos(),
          metricsRow({ industry: 'construcción', visitCount: 1 }),
        ]),
      );

      const response = await request(app).get(
        '/api/admin/demos/metrics?from=2026-01-01&to=2026-12-31&groupBy=industry',
      );

      expect(response.status).toBe(200);
      const { groups } = response.body as {
        groups: { key: string; funnel: { created: number; opened: number } }[];
      };
      expect(groups.map((group) => [group.key, group.funnel.created])).toEqual([
        ['pastelería', 10],
        ['construcción', 1],
      ]);
    });

    it('un rango sin demos responde ceros, no un error', async () => {
      const { app } = build(owner);

      const response = await request(app).get(
        '/api/admin/demos/metrics?from=2031-01-01&to=2031-01-31&groupBy=template',
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        funnel: {
          created: 0,
          opened: 0,
          converted: 0,
          openRate: 0,
          conversionRate: 0,
          conversionRateOfOpened: 0,
        },
        timing: { medianDaysToFirstVisit: null, medianDaysToConversion: null },
        engagement: { avgVisitsPerOpenedDemo: 0, avgExtensions: 0 },
        groups: [],
      });
    });

    it('sin fechas, los últimos 90 días hasta hoy', async () => {
      const metricsRepository = buildMetricsRepository();
      const { app } = build(owner, buildRepository(), metricsRepository);

      const response = await request(app).get('/api/admin/demos/metrics');

      expect(response.status).toBe(200);
      const [start, end] = metricsRepository.findCreatedBetween.mock.calls[0];
      const days = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
      // 90 días de calendario; uno más o menos si el rango cruza un cambio de hora.
      expect(Math.round(days)).toBe(90);
      expect(end.getTime()).toBeGreaterThan(Date.now());
    });

    it.each([
      ['from posterior a to', 'from=2026-02-01&to=2026-01-01'],
      ['un formato que no es AAAA-MM-DD', 'from=01-02-2026'],
      ['una fecha que no existe', 'to=2026-02-30'],
      ['una agrupación desconocida', 'groupBy=prospect'],
    ])('400 con %s', async (_label, query) => {
      const { app, metricsRepository } = build(owner);

      const response = await request(app).get(`/api/admin/demos/metrics?${query}`);

      expect(response.status).toBe(400);
      expect(metricsRepository.findCreatedBetween).not.toHaveBeenCalled();
    });

    it.each([
      ['el owner', owner, 200],
      ['una clave full', fullKey, 200],
      ['un editor', staff, 403],
      ['una clave write', writeKey, 403],
      ['una clave de solo lectura', readKey, 403],
      ['un usuario client', client, 403],
      [
        'una clave full limitada a algunos clientes',
        { ...fullKey, tenantScope: [TENANT_ID] },
        403,
      ],
    ])('%s: %i', async (_label, actor, status) => {
      const { app, metricsRepository } = build(actor);

      const response = await request(app).get('/api/admin/demos/metrics');

      expect(response.status).toBe(status);
      if (status === 403) {
        expect(metricsRepository.findCreatedBetween).not.toHaveBeenCalled();
      }
    });

    it('al editor se le dice por qué, sin confundirlo con una demo que no existe', async () => {
      const { app } = build(staff);

      const response = await request(app).get('/api/admin/demos/metrics');

      expect((response.body as { message: string }).message).toContain(
        'persona dueña de la cuenta',
      );
    });
  });
});
