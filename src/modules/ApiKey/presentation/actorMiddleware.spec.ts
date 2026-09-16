import express, { type Express } from 'express';
import request from 'supertest';
import {
  createActorMiddleware,
  getRequestActor,
  requireMethodPermission,
  requirePermission,
  requireTenantScope,
} from './actorMiddleware';
import type { VerifyTokenUseCase } from '../../Auth/application/VerifyTokenUseCase';
import { AdminUser } from '../../Auth/domain/AdminUser';
import type { AuthenticateApiKeyUseCase } from '../application/AuthenticateApiKeyUseCase';
import { RateLimiter } from '../application/RateLimiter';
import type { Actor } from '../domain/Actor';
import { ErrorHandler } from '../../../shared/presentation/ErrorHandler';

describe('actorMiddleware', () => {
  const buildVerifyTokenUseCase = (): jest.Mocked<VerifyTokenUseCase> =>
    ({
      execute: jest.fn().mockResolvedValue(new AdminUser(1, 'a@a.com', 'Admin', 'hash')),
    }) as unknown as jest.Mocked<VerifyTokenUseCase>;

  const buildAuthenticateApiKeyUseCase = (
    actor: Actor = {
      type: 'apiKey',
      id: 7,
      name: 'Agente MCP',
      permission: 'write',
      tenantScope: null,
      rateLimitPerMinute: 120,
    },
  ): jest.Mocked<AuthenticateApiKeyUseCase> =>
    ({
      execute: jest.fn().mockResolvedValue(actor),
    }) as unknown as jest.Mocked<AuthenticateApiKeyUseCase>;

  const buildApp = (
    verifyTokenUseCase: jest.Mocked<VerifyTokenUseCase>,
    authenticateApiKeyUseCase: jest.Mocked<AuthenticateApiKeyUseCase>,
    rateLimiter: RateLimiter = new RateLimiter(),
  ): Express => {
    const app = express();
    app.use(express.json());
    const actorMiddleware = createActorMiddleware(
      verifyTokenUseCase,
      authenticateApiKeyUseCase,
      rateLimiter,
    );
    app.use(actorMiddleware);
    app.get('/whoami', (_req, res) => {
      res.json(getRequestActor(res));
    });
    app.post('/write', requireMethodPermission, (_req, res) => res.json({ ok: true }));
    app.patch('/write', requireMethodPermission, (_req, res) => res.json({ ok: true }));
    app.delete('/write', requireMethodPermission, (_req, res) => res.json({ ok: true }));
    app.post('/full-only', requirePermission('full'), (_req, res) =>
      res.json({ ok: true }),
    );
    app.get('/tenants/:tenantId/pages', requireTenantScope, (_req, res) =>
      res.json({ ok: true }),
    );
    app.use(new ErrorHandler().handle);
    return app;
  };

  it('rejects a request without Authorization nor X-Api-Key with 401', async () => {
    const app = buildApp(buildVerifyTokenUseCase(), buildAuthenticateApiKeyUseCase());

    const response = await request(app).get('/whoami');

    expect(response.status).toBe(401);
  });

  it('routes a wb_ token to AuthenticateApiKeyUseCase, not VerifyTokenUseCase', async () => {
    const verifyTokenUseCase = buildVerifyTokenUseCase();
    const authenticateApiKeyUseCase = buildAuthenticateApiKeyUseCase();
    const app = buildApp(verifyTokenUseCase, authenticateApiKeyUseCase);

    await request(app).get('/whoami').set('Authorization', 'Bearer wb_abc_def');

    expect(authenticateApiKeyUseCase.execute).toHaveBeenCalledWith('wb_abc_def');
    expect(verifyTokenUseCase.execute).not.toHaveBeenCalled();
  });

  it('routes any other token to VerifyTokenUseCase, not AuthenticateApiKeyUseCase', async () => {
    const verifyTokenUseCase = buildVerifyTokenUseCase();
    const authenticateApiKeyUseCase = buildAuthenticateApiKeyUseCase();
    const app = buildApp(verifyTokenUseCase, authenticateApiKeyUseCase);

    await request(app).get('/whoami').set('Authorization', 'Bearer sesion.jwt.token');

    expect(verifyTokenUseCase.execute).toHaveBeenCalledWith('sesion.jwt.token');
    expect(authenticateApiKeyUseCase.execute).not.toHaveBeenCalled();
  });

  it('accepts an api key via Authorization: Bearer', async () => {
    const app = buildApp(buildVerifyTokenUseCase(), buildAuthenticateApiKeyUseCase());

    const response = await request(app)
      .get('/whoami')
      .set('Authorization', 'Bearer wb_x_y');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ type: 'apiKey' });
  });

  it('accepts an api key via the X-Api-Key header', async () => {
    const app = buildApp(buildVerifyTokenUseCase(), buildAuthenticateApiKeyUseCase());

    const response = await request(app).get('/whoami').set('X-Api-Key', 'wb_x_y');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ type: 'apiKey' });
  });

  it('requirePermission("full") rejects a write actor with 403 Forbidden', async () => {
    const app = buildApp(
      buildVerifyTokenUseCase(),
      buildAuthenticateApiKeyUseCase({
        type: 'apiKey',
        id: 7,
        name: 'Agente MCP',
        permission: 'write',
        tenantScope: null,
        rateLimitPerMinute: 120,
      }),
    );

    const response = await request(app).post('/full-only').set('X-Api-Key', 'wb_x_y');

    expect(response.status).toBe(403);
    expect((response.body as { error: string }).error).toBe('Forbidden');
  });

  describe('requireMethodPermission', () => {
    const readActor: Actor = {
      type: 'apiKey',
      id: 7,
      name: 'Agente MCP',
      permission: 'read',
      tenantScope: null,
      rateLimitPerMinute: 120,
    };
    const writeActor: Actor = { ...readActor, permission: 'write' };
    const fullActor: Actor = { ...readActor, permission: 'full' };

    it('lets GET pass with a read actor', async () => {
      const app = buildApp(
        buildVerifyTokenUseCase(),
        buildAuthenticateApiKeyUseCase(readActor),
      );

      const response = await request(app).get('/whoami').set('X-Api-Key', 'wb_x_y');

      expect(response.status).toBe(200);
    });

    it('requires write for POST and PATCH', async () => {
      const readApp = buildApp(
        buildVerifyTokenUseCase(),
        buildAuthenticateApiKeyUseCase(readActor),
      );
      const writeApp = buildApp(
        buildVerifyTokenUseCase(),
        buildAuthenticateApiKeyUseCase(writeActor),
      );

      const rejectedPost = await request(readApp)
        .post('/write')
        .set('X-Api-Key', 'wb_x_y');
      const rejectedPatch = await request(readApp)
        .patch('/write')
        .set('X-Api-Key', 'wb_x_y');
      const allowedPost = await request(writeApp)
        .post('/write')
        .set('X-Api-Key', 'wb_x_y');
      const allowedPatch = await request(writeApp)
        .patch('/write')
        .set('X-Api-Key', 'wb_x_y');

      expect(rejectedPost.status).toBe(403);
      expect(rejectedPatch.status).toBe(403);
      expect(allowedPost.status).toBe(200);
      expect(allowedPatch.status).toBe(200);
    });

    it('requires full for DELETE', async () => {
      const writeApp = buildApp(
        buildVerifyTokenUseCase(),
        buildAuthenticateApiKeyUseCase(writeActor),
      );
      const fullApp = buildApp(
        buildVerifyTokenUseCase(),
        buildAuthenticateApiKeyUseCase(fullActor),
      );

      const rejected = await request(writeApp)
        .delete('/write')
        .set('X-Api-Key', 'wb_x_y');
      const allowed = await request(fullApp).delete('/write').set('X-Api-Key', 'wb_x_y');

      expect(rejected.status).toBe(403);
      expect(allowed.status).toBe(200);
    });
  });

  describe('requireTenantScope', () => {
    const scopedActor: Actor = {
      type: 'apiKey',
      id: 7,
      name: 'Agente MCP',
      permission: 'full',
      tenantScope: [2],
      rateLimitPerMinute: 120,
    };

    it('rejects a tenant outside the scope with 403', async () => {
      const app = buildApp(
        buildVerifyTokenUseCase(),
        buildAuthenticateApiKeyUseCase(scopedActor),
      );

      const response = await request(app)
        .get('/tenants/9/pages')
        .set('X-Api-Key', 'wb_x_y');

      expect(response.status).toBe(403);
    });

    it('lets a tenant inside the scope through', async () => {
      const app = buildApp(
        buildVerifyTokenUseCase(),
        buildAuthenticateApiKeyUseCase(scopedActor),
      );

      const response = await request(app)
        .get('/tenants/2/pages')
        .set('X-Api-Key', 'wb_x_y');

      expect(response.status).toBe(200);
    });
  });

  it('never rate-limits an admin panel session', async () => {
    const rateLimiter = new RateLimiter();
    const checkSpy = jest.spyOn(rateLimiter, 'check');
    const app = buildApp(
      buildVerifyTokenUseCase(),
      buildAuthenticateApiKeyUseCase(),
      rateLimiter,
    );

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app).get('/whoami').set('Authorization', 'Bearer sesion'),
      ),
    );

    responses.forEach((response) => expect(response.status).toBe(200));

    expect(checkSpy).not.toHaveBeenCalled();
  });

  it('returns 429 with Retry-After once the api key exceeds its rate limit', async () => {
    const app = buildApp(
      buildVerifyTokenUseCase(),
      buildAuthenticateApiKeyUseCase({
        type: 'apiKey',
        id: 7,
        name: 'Agente MCP',
        permission: 'read',
        tenantScope: null,
        rateLimitPerMinute: 1,
      }),
    );

    await request(app).get('/whoami').set('X-Api-Key', 'wb_x_y');
    const response = await request(app).get('/whoami').set('X-Api-Key', 'wb_x_y');

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBeDefined();
  });
});
