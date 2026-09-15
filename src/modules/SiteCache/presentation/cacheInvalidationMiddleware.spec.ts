import express, { type Express } from 'express';
import request from 'supertest';
import { createCacheInvalidationMiddleware } from './cacheInvalidationMiddleware';
import type { InvalidateTenantCacheUseCase } from '../application/InvalidateTenantCacheUseCase';

describe('createCacheInvalidationMiddleware', () => {
  const buildApp = (
    useCase: InvalidateTenantCacheUseCase,
    status = 200,
  ): { app: Express } => {
    const app = express();
    app.use(
      '/api/admin/tenants/:tenantId/pages',
      createCacheInvalidationMiddleware(useCase),
      (_req, res) => {
        res.status(status).json({ ok: true });
      },
    );
    return { app };
  };

  const buildUseCase = (): jest.Mocked<InvalidateTenantCacheUseCase> =>
    ({
      execute: jest.fn().mockResolvedValue(undefined),
    }) as unknown as jest.Mocked<InvalidateTenantCacheUseCase>;

  it('invalida el tenant de la ruta después de una escritura exitosa', async () => {
    const useCase = buildUseCase();
    const { app } = buildApp(useCase, 201);

    await request(app).post('/api/admin/tenants/9/pages');

    expect(useCase.execute).toHaveBeenCalledWith(9);
  });

  it('no invalida nada cuando la escritura falló', async () => {
    const useCase = buildUseCase();
    const { app } = buildApp(useCase, 422);

    await request(app).post('/api/admin/tenants/9/pages');

    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('no invalida en lecturas', async () => {
    const useCase = buildUseCase();
    const { app } = buildApp(useCase);

    await request(app).get('/api/admin/tenants/9/pages');

    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('invalida solo el tenant de la ruta, nunca otro', async () => {
    const useCase = buildUseCase();
    const { app } = buildApp(useCase, 200);

    await request(app).patch('/api/admin/tenants/3/pages');

    expect(useCase.execute).toHaveBeenCalledTimes(1);
    expect(useCase.execute).toHaveBeenCalledWith(3);
  });
});
