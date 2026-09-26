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
import { Demo } from '../domain/Demo';
import type { DemoRepository, DemoView } from '../domain/DemoRepository';
import { Prospect } from '../domain/Prospect';
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
  const view: DemoView = {
    demo: new Demo(
      DEMO_ID,
      TENANT_ID,
      PROSPECT_ID,
      null,
      'pastelería',
      { type: 'admin', id: staff.id, name: 'Pau' },
      NOW,
      new Date('2099-01-01T00:00:00Z'),
      null,
      null,
      { count: 0, firstAt: null, lastAt: null },
      null,
    ),
    site: {
      tenantId: TENANT_ID,
      slug: 'demo-pasteleria-luna',
      name: 'Pastelería Luna',
      address: 'demo-pasteleria-luna.webbuilder.co',
    },
    prospect: { id: PROSPECT_ID, businessName: 'Pastelería Luna' },
  };

  const buildRepository = (): jest.Mocked<DemoRepository> => ({
    create: jest.fn().mockResolvedValue(DEMO_ID),
    isAddressTaken: jest.fn().mockResolvedValue(false),
    findById: jest.fn().mockResolvedValue(view),
    list: jest.fn().mockResolvedValue([view]),
    findProspect: jest.fn().mockResolvedValue(prospect),
    updateProspect: jest.fn().mockResolvedValue(prospect),
    replaceAccessToken: jest.fn(),
    findAccess: jest.fn(),
    recordVisit: jest.fn(),
    listVisits: jest.fn(),
  });

  const build = (
    actor: Actor,
    repository = buildRepository(),
  ): { app: Express; repository: jest.Mocked<DemoRepository>; logs: jest.Mock } => {
    const logs = jest.fn().mockResolvedValue(undefined);
    const activity = new RecordActivityUseCase({
      record: logs,
    } as unknown as ActivityLogRepository);
    const source: SiteContentSource = {
      fromTemplate: jest.fn().mockResolvedValue(EMPTY_SITE_CONTENT),
      listTemplates: jest.fn().mockResolvedValue([]),
    };
    const platform = new PlatformDomainConfig('webbuilder.co', 'sitios.webbuilder.co');
    const controller = new AdminDemoController(
      new CreateDemoUseCase(
        repository,
        new CreateTenantUseCase({} as TenantRepository, source, platform),
        source,
        platform,
        activity,
      ),
      new QueryDemosUseCase(repository),
      new UpdateProspectUseCase(repository, activity),
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
    return { app, repository, logs };
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
});
