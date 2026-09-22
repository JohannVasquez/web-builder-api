import { createServer, type Server } from 'node:http';
import express, { type Express } from 'express';
import request from 'supertest';
import { NewsletterController } from './NewsletterController';
import { createAdminNewsletterRouter, createNewsletterRouter } from './newsletterRouter';
import { RateLimiter } from '@/modules/ApiKey/application/RateLimiter';
import { SubscribeToNewsletterUseCase } from '../application/SubscribeToNewsletterUseCase';
import { ListSubscribersUseCase } from '../application/ListSubscribersUseCase';
import { UnsubscribeFromNewsletterUseCase } from '../application/UnsubscribeFromNewsletterUseCase';
import type { NewsletterRepository } from '../domain/NewsletterRepository';
import { Tenant } from '@/modules/Tenant/domain/Tenant';
import { ErrorHandler } from '@/shared/presentation/ErrorHandler';

// Un solo servidor para los bucles de peticiones: `request(app)` levanta uno efímero por
// llamada, y varios seguidos hacen fallar el test por sockets, no por el límite probado.
const openServer = (app: Express): Server => createServer(app).listen(0);

describe('NewsletterController (HTTP)', () => {
  const buildRepository = (): jest.Mocked<NewsletterRepository> => ({
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn(),
    list: jest.fn().mockResolvedValue({
      subscribers: [
        {
          id: 1,
          email: 'ana@ejemplo.cl',
          unsubscribedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
    }),
  });

  const buildApp = (
    repository: NewsletterRepository,
    rateLimiter = new RateLimiter(),
    tenantId = '018f6f1a-0000-7000-8000-000000000001',
  ): Express => {
    const controller = new NewsletterController(
      new SubscribeToNewsletterUseCase(repository),
      new ListSubscribersUseCase(repository),
      new UnsubscribeFromNewsletterUseCase(repository),
      rateLimiter,
    );
    const app = express();
    app.use(express.json());
    app.use((_req, res, next) => {
      (res.locals as { tenant?: Tenant }).tenant = new Tenant(
        tenantId,
        'demo',
        'Demo',
        'demo.cl',
      );
      next();
    });
    app.use('/api/newsletter', createNewsletterRouter(controller));
    app.use(
      '/api/admin/tenants/:tenantId/subscribers',
      createAdminNewsletterRouter(controller),
    );
    app.use(new ErrorHandler().handle);
    return app;
  };

  it('guarda la suscripción del visitante', async () => {
    const repository = buildRepository();

    const response = await request(buildApp(repository))
      .post('/api/newsletter')
      .send({ email: 'ana@ejemplo.cl' });

    expect(response.status).toBe(200);
    expect(repository.subscribe).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000001',
      'ana@ejemplo.cl',
    );
  });

  it('rechaza un correo inválido con un mensaje entendible', async () => {
    const response = await request(buildApp(buildRepository()))
      .post('/api/newsletter')
      .send({ email: 'no-es-un-correo' });

    expect(response.status).toBe(400);
  });

  it('descarta el envío de un bot que llenó el campo trampa', async () => {
    const repository = buildRepository();

    const response = await request(buildApp(repository))
      .post('/api/newsletter')
      .send({ email: 'ana@ejemplo.cl', website: 'http://spam.cl' });

    expect(response.status).toBe(400);
    expect(repository.subscribe).not.toHaveBeenCalled();
  });

  it('corta al sexto envío seguido desde la misma conexión', async () => {
    const server = openServer(buildApp(buildRepository()));

    try {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await request(server).post('/api/newsletter').send({ email: 'ana@ejemplo.cl' });
      }
      const blocked = await request(server)
        .post('/api/newsletter')
        .send({ email: 'ana@ejemplo.cl' });

      expect(blocked.status).toBe(429);
      expect(blocked.headers['retry-after']).toBeDefined();
    } finally {
      server.close();
    }
  });

  it('la cuota es por tenant: agotar uno no bloquea a otro', async () => {
    const rateLimiter = new RateLimiter();
    const first = buildApp(
      buildRepository(),
      rateLimiter,
      '018f6f1a-0000-7000-8000-000000000001',
    );
    const second = buildApp(
      buildRepository(),
      rateLimiter,
      '018f6f1a-0000-7000-8000-000000000002',
    );

    const firstServer = openServer(first);
    const secondServer = openServer(second);

    try {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        await request(firstServer)
          .post('/api/newsletter')
          .send({ email: 'ana@ejemplo.cl' });
      }
      const other = await request(secondServer)
        .post('/api/newsletter')
        .send({ email: 'ana@ejemplo.cl' });

      expect(other.status).toBe(200);
    } finally {
      firstServer.close();
      secondServer.close();
    }
  });

  it('lista los suscriptores del cliente de la ruta', async () => {
    const repository = buildRepository();

    const response = await request(buildApp(repository)).get(
      '/api/admin/tenants/018f6f1a-0000-7000-8000-000000000007/subscribers',
    );

    expect(response.status).toBe(200);
    expect(repository.list).toHaveBeenCalledWith(
      '018f6f1a-0000-7000-8000-000000000007',
      100,
      0,
    );
  });

  it('exporta los suscriptores como CSV descargable', async () => {
    const response = await request(buildApp(buildRepository())).get(
      '/api/admin/tenants/018f6f1a-0000-7000-8000-000000000007/subscribers/export.csv',
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.text).toContain('"ana@ejemplo.cl"');
  });
});
