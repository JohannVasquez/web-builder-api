import express, { type Express, Router } from 'express';
import request from 'supertest';
import { AdminBrandController } from './AdminBrandController';
import { createAdminBrandRouter } from './adminBrandRouter';
import { GetBrandUseCase } from '../application/GetBrandUseCase';
import { UpdateBrandUseCase } from '../application/UpdateBrandUseCase';
import { BrandSchema } from '../domain/BrandSchema';
import { FONT_PAIRINGS } from '../domain/fontPairings';
import type { BrandRepository } from '../domain/BrandRepository';
import { ErrorHandler } from '../../../shared/presentation/ErrorHandler';

describe('AdminBrandController (HTTP)', () => {
  const buildRepository = (): jest.Mocked<BrandRepository> => ({
    find: jest.fn().mockResolvedValue(BrandSchema.parse({})),
    update: jest.fn().mockResolvedValue(BrandSchema.parse({})),
  });

  const buildApp = (repository: BrandRepository): Express => {
    const controller = new AdminBrandController(
      new GetBrandUseCase(repository),
      new UpdateBrandUseCase(repository),
    );
    const app = express();
    app.use(express.json());
    app.use('/api/admin/tenants/:tenantId/brand', createAdminBrandRouter(controller));
    const fontPairingsRouter = Router();
    fontPairingsRouter.get('/', controller.listFontPairings);
    app.use('/api/admin/font-pairings', fontPairingsRouter);
    app.use(new ErrorHandler().handle);
    return app;
  };

  it('returns the brand of the tenant in the route', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app).get('/api/admin/tenants/3/brand');

    expect(response.status).toBe(200);
    expect(repository.find).toHaveBeenCalledWith(3);
    expect(response.body).toEqual({ brand: BrandSchema.parse({}) });
  });

  it('updates the brand and returns 200 with the changes forwarded to the use case', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app)
      .patch('/api/admin/tenants/3/brand')
      .send({ colorMode: 'dark' });

    expect(response.status).toBe(200);
    expect(repository.update).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ colorMode: 'dark' }),
    );
  });

  it('returns 400 with ValidationError for an invalid color', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app)
      .patch('/api/admin/tenants/3/brand')
      .send({ palette: { primary: 'rojo' } });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'ValidationError' });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('returns 400 for an unknown key', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app)
      .patch('/api/admin/tenants/3/brand')
      .send({ unknownKey: true });

    expect(response.status).toBe(400);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('returns the font pairing catalog', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app).get('/api/admin/font-pairings');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ fontPairings: FONT_PAIRINGS });
  });
});
