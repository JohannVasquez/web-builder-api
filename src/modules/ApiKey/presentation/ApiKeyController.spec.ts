import express, { type Express, type RequestHandler } from 'express';
import request from 'supertest';
import { ApiKeyController } from './ApiKeyController';
import { createApiKeyRouter } from './apiKeyRouter';
import { setRequestActor } from './actorMiddleware';
import type { CreateApiKeyUseCase } from '../application/CreateApiKeyUseCase';
import type { ListApiKeysUseCase } from '../application/ListApiKeysUseCase';
import type { RevokeApiKeyUseCase } from '../application/RevokeApiKeyUseCase';
import type { RegenerateApiKeyUseCase } from '../application/RegenerateApiKeyUseCase';
import type { Actor } from '../domain/Actor';
import { ErrorHandler } from '@/shared/presentation/ErrorHandler';

describe('ApiKeyController (HTTP)', () => {
  const adminActor: Actor = {
    type: 'admin',
    id: '018f6f1a-0000-7000-8000-000000000005',
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

  const buildUseCases = (): {
    createApiKeyUseCase: jest.Mocked<CreateApiKeyUseCase>;
    listApiKeysUseCase: jest.Mocked<ListApiKeysUseCase>;
    revokeApiKeyUseCase: jest.Mocked<RevokeApiKeyUseCase>;
    regenerateApiKeyUseCase: jest.Mocked<RegenerateApiKeyUseCase>;
  } => ({
    createApiKeyUseCase: {
      execute: jest.fn().mockResolvedValue({
        apiKey: { id: '018f6f1a-0000-7000-8000-000000000001', name: 'Agente MCP' },
        token: 'wb_new_token',
      }),
    } as unknown as jest.Mocked<CreateApiKeyUseCase>,
    listApiKeysUseCase: {
      execute: jest
        .fn()
        .mockResolvedValue([
          { id: '018f6f1a-0000-7000-8000-000000000001', name: 'Agente MCP' },
        ]),
    } as unknown as jest.Mocked<ListApiKeysUseCase>,
    revokeApiKeyUseCase: {
      execute: jest.fn().mockResolvedValue({
        id: '018f6f1a-0000-7000-8000-000000000001',
        name: 'Agente MCP',
        status: 'revoked',
      }),
    } as unknown as jest.Mocked<RevokeApiKeyUseCase>,
    regenerateApiKeyUseCase: {
      execute: jest.fn().mockResolvedValue({
        apiKey: { id: '018f6f1a-0000-7000-8000-000000000002', name: 'Agente MCP' },
        token: 'wb_regenerated_token',
      }),
    } as unknown as jest.Mocked<RegenerateApiKeyUseCase>,
  });

  const buildApp = (
    useCases: ReturnType<typeof buildUseCases>,
    actor: Actor,
  ): Express => {
    const controller = new ApiKeyController(
      useCases.createApiKeyUseCase,
      useCases.listApiKeysUseCase,
      useCases.revokeApiKeyUseCase,
      useCases.regenerateApiKeyUseCase,
    );
    const fakeActor: RequestHandler = (_req, res, next) => {
      setRequestActor(res, actor);
      next();
    };
    const app = express();
    app.use(express.json());
    app.use('/api/admin/api-keys', fakeActor, createApiKeyRouter(controller));
    app.use(new ErrorHandler().handle);
    return app;
  };

  it('creates an api key and returns 201 with token and warning', async () => {
    const useCases = buildUseCases();
    const app = buildApp(useCases, adminActor);

    const response = await request(app)
      .post('/api/admin/api-keys')
      .send({ name: 'Agente MCP' });

    expect(response.status).toBe(201);
    const body = response.body as { token: string; warning: string };
    expect(body.token).toBe('wb_new_token');
    expect(body.warning).toEqual(expect.any(String));
    expect(useCases.createApiKeyUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Agente MCP' }),
      '018f6f1a-0000-7000-8000-000000000005',
    );
  });

  it('lists api keys', async () => {
    const useCases = buildUseCases();
    const app = buildApp(useCases, adminActor);

    const response = await request(app).get('/api/admin/api-keys');

    expect(response.status).toBe(200);
    expect(useCases.listApiKeysUseCase.execute).toHaveBeenCalled();
    expect(response.body).toMatchObject({
      apiKeys: [{ id: '018f6f1a-0000-7000-8000-000000000001', name: 'Agente MCP' }],
    });
  });

  it('revokes an api key', async () => {
    const useCases = buildUseCases();
    const app = buildApp(useCases, adminActor);

    const response = await request(app).delete(
      '/api/admin/api-keys/018f6f1a-0000-7000-8000-000000000001',
    );

    expect(response.status).toBe(200);
    expect(useCases.revokeApiKeyUseCase.execute).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000001',
    );
  });

  it('regenerates an api key and returns 201 with a new token', async () => {
    const useCases = buildUseCases();
    const app = buildApp(useCases, adminActor);

    const response = await request(app).post(
      '/api/admin/api-keys/018f6f1a-0000-7000-8000-000000000001/regenerate',
    );

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ token: 'wb_regenerated_token' });
    expect(useCases.regenerateApiKeyUseCase.execute).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000001',
    );
  });

  describe('a key managing keys', () => {
    it('rejects creating a key with 403', async () => {
      const useCases = buildUseCases();
      const app = buildApp(useCases, apiKeyActor);

      const response = await request(app)
        .post('/api/admin/api-keys')
        .send({ name: 'Otra clave' });

      expect(response.status).toBe(403);
      expect(useCases.createApiKeyUseCase.execute).not.toHaveBeenCalled();
    });

    it('rejects revoking a key with 403', async () => {
      const useCases = buildUseCases();
      const app = buildApp(useCases, apiKeyActor);

      const response = await request(app).delete(
        '/api/admin/api-keys/018f6f1a-0000-7000-8000-000000000001',
      );

      expect(response.status).toBe(403);
      expect(useCases.revokeApiKeyUseCase.execute).not.toHaveBeenCalled();
    });

    it('rejects regenerating a key with 403', async () => {
      const useCases = buildUseCases();
      const app = buildApp(useCases, apiKeyActor);

      const response = await request(app).post(
        '/api/admin/api-keys/018f6f1a-0000-7000-8000-000000000001/regenerate',
      );

      expect(response.status).toBe(403);
      expect(useCases.regenerateApiKeyUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
