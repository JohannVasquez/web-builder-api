import express, { type Express, type RequestHandler } from 'express';
import request from 'supertest';
import { createActivityRecordingMiddleware } from './activityRecordingMiddleware';
import { setRequestActor } from '@/modules/ApiKey/presentation/actorMiddleware';
import type { RecordActivityUseCase } from '../application/RecordActivityUseCase';
import type { Actor } from '@/modules/ApiKey/domain/Actor';

describe('createActivityRecordingMiddleware', () => {
  const adminActor: Actor = {
    type: 'admin',
    id: '018f6f1a-0000-7000-8000-000000000001',
    name: 'Admin',
    role: 'owner',
    permission: 'full',
    tenantScope: null,
    rateLimitPerMinute: null,
  };

  const apiKeyActor: Actor = {
    type: 'apiKey',
    id: '018f6f1a-0000-7000-8000-000000000007',
    name: 'Agente MCP',
    role: null,
    permission: 'full',
    tenantScope: null,
    rateLimitPerMinute: 120,
  };

  const buildUseCase = (): jest.Mocked<RecordActivityUseCase> =>
    ({
      execute: jest.fn().mockResolvedValue(undefined),
    }) as unknown as jest.Mocked<RecordActivityUseCase>;

  const buildApp = (
    useCase: RecordActivityUseCase,
    actor: Actor,
    mountPath: string,
    status: number,
  ): Express => {
    const fakeActor: RequestHandler = (_req, res, next) => {
      setRequestActor(res, actor);
      next();
    };
    const app = express();
    app.use(express.json());
    app.use(
      mountPath,
      fakeActor,
      createActivityRecordingMiddleware(useCase),
      (_req, res) => {
        res.status(status).json({ ok: status < 400 });
      },
    );
    return app;
  };

  it('records a 2xx PATCH to a page with the route tenant and page.update', async () => {
    const useCase = buildUseCase();
    const app = buildApp(
      useCase,
      adminActor,
      '/api/admin/tenants/:tenantId/pages/:pageId',
      200,
    );

    await request(app).patch(
      '/api/admin/tenants/018f6f1a-0000-7000-8000-000000000003/pages/018f6f1a-0000-7000-8000-000000000001',
    );

    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: '018f6f1a-0000-7000-8000-000000000003',
        actorType: 'admin',
        actorId: '018f6f1a-0000-7000-8000-000000000001',
        actorName: 'Admin',
        action: 'page.update',
        entityType: 'page',
      }),
    );
  });

  it('records section.create on a POST to a nested sections route', async () => {
    const useCase = buildUseCase();
    const app = buildApp(
      useCase,
      adminActor,
      '/api/admin/tenants/:tenantId/pages/:pageId/sections',
      201,
    );

    await request(app).post(
      '/api/admin/tenants/018f6f1a-0000-7000-8000-000000000003/pages/018f6f1a-0000-7000-8000-000000000001/sections',
    );

    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'section.create', entityType: 'section' }),
    );
  });

  it('records page.delete on a DELETE to a page route', async () => {
    const useCase = buildUseCase();
    const app = buildApp(
      useCase,
      adminActor,
      '/api/admin/tenants/:tenantId/pages/:pageId',
      200,
    );

    await request(app).delete(
      '/api/admin/tenants/018f6f1a-0000-7000-8000-000000000003/pages/018f6f1a-0000-7000-8000-000000000001',
    );

    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'page.delete', entityType: 'page' }),
    );
  });

  it('records nothing for a failed write', async () => {
    const useCase = buildUseCase();
    const app = buildApp(
      useCase,
      adminActor,
      '/api/admin/tenants/:tenantId/pages/:pageId',
      422,
    );

    await request(app).patch(
      '/api/admin/tenants/018f6f1a-0000-7000-8000-000000000003/pages/018f6f1a-0000-7000-8000-000000000001',
    );

    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('records nothing for a GET', async () => {
    const useCase = buildUseCase();
    const app = buildApp(
      useCase,
      adminActor,
      '/api/admin/tenants/:tenantId/pages/:pageId',
      200,
    );

    await request(app).get(
      '/api/admin/tenants/018f6f1a-0000-7000-8000-000000000003/pages/018f6f1a-0000-7000-8000-000000000001',
    );

    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('carries an api key actor as actorType apiKey with the key name', async () => {
    const useCase = buildUseCase();
    const app = buildApp(
      useCase,
      apiKeyActor,
      '/api/admin/tenants/:tenantId/pages/:pageId',
      200,
    );

    await request(app).patch(
      '/api/admin/tenants/018f6f1a-0000-7000-8000-000000000003/pages/018f6f1a-0000-7000-8000-000000000001',
    );

    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ actorType: 'apiKey', actorName: 'Agente MCP' }),
    );
  });

  it('records tenantId as null for a route without :tenantId', async () => {
    const useCase = buildUseCase();
    const app = buildApp(useCase, adminActor, '/api/admin/api-keys/:apiKeyId', 200);

    await request(app).delete('/api/admin/api-keys/018f6f1a-0000-7000-8000-000000000001');

    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: null }),
    );
  });
});
