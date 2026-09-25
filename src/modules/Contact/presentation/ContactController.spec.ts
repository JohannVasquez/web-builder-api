import { createServer, type Server } from 'node:http';
import express, { type Express } from 'express';
import request from 'supertest';
import { ContactController } from './ContactController';
import { SendContactEmailUseCase } from '../application/SendContactEmailUseCase';
import type { EmailService } from '../domain/EmailService';
import type { ContactMessagePrimitives } from '../domain/ContactMessage';
import type { ContactMessageRepository } from '../domain/ContactMessageRepository';
import { createContactRouter } from './contactRouter';
import { GlobalSettings } from '@/modules/GlobalSettings/domain/GlobalSettings';
import type { GlobalSettingsRepository } from '@/modules/GlobalSettings/domain/GlobalSettingsRepository';
import { RateLimiter } from '@/modules/ApiKey/application/RateLimiter';
import { Tenant } from '@/modules/Tenant/domain/Tenant';
import { ErrorHandler } from '@/shared/presentation/ErrorHandler';

const openServer = (app: Express): Server => createServer(app).listen(0);

describe('ContactController (HTTP)', () => {
  const buildEmailService = (): jest.Mocked<EmailService> => ({
    sendContactEmail: jest.fn().mockResolvedValue(undefined),
  });

  const buildStoredMessage = (): ContactMessagePrimitives => ({
    id: '018f6f1a-0000-7000-8000-000000000001',
    tenantId: '018f6f1a-0000-7000-8000-000000000001',
    name: 'Johann Vasquez',
    email: 'johann@example.com',
    phone: null,
    message: 'Quiero más información sobre sus servicios.',
    emailedAt: null,
    emailError: null,
    readAt: null,
    createdAt: new Date().toISOString(),
  });

  const buildContactMessageRepository = (): jest.Mocked<ContactMessageRepository> => ({
    save: jest.fn().mockResolvedValue(buildStoredMessage()),
    markEmailed: jest.fn().mockResolvedValue(undefined),
    markRead: jest.fn(),
    search: jest.fn(),
  });

  const buildApp = (options: {
    emailService: EmailService;
    rateLimiter?: RateLimiter;
    tenantId?: string;
  }): Express => {
    const {
      emailService,
      rateLimiter = new RateLimiter(),
      tenantId = '018f6f1a-0000-7000-8000-000000000001',
    } = options;
    const app = express();
    app.use(express.json());
    const settingsRepository: jest.Mocked<GlobalSettingsRepository> = {
      upsert: jest.fn(),
      find: jest
        .fn()
        .mockResolvedValue(
          GlobalSettings.fromRecord({ contactEmail: 'ventas@tenant.cl' }),
        ),
    };
    const useCase = new SendContactEmailUseCase(
      emailService,
      settingsRepository,
      buildContactMessageRepository(),
    );
    const controller = new ContactController(useCase, rateLimiter);
    // Simula el tenantResolver montado en app.ts: deja el tenant en res.locals.
    app.use((_req, res, next) => {
      (res.locals as { tenant?: Tenant }).tenant = new Tenant(
        tenantId,
        'default',
        'Tenant de prueba',
        'localhost',
      );
      next();
    });
    app.use('/api/contact', createContactRouter(controller));
    app.use(new ErrorHandler().handle);
    return app;
  };

  const validPayload = {
    name: 'Johann Vasquez',
    email: 'johann@example.com',
    message: 'Quiero más información sobre sus servicios.',
  };

  it('returns 200 and success feedback for a valid payload', async () => {
    const emailService = buildEmailService();
    const app = buildApp({ emailService });

    const response = await request(app).post('/api/contact').send(validPayload);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true });
    expect(emailService.sendContactEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendContactEmail.mock.calls[0]?.[1]).toBe('ventas@tenant.cl');
  });

  it('returns 200 even when the email fails, because the message was already stored', async () => {
    const emailService = buildEmailService();
    emailService.sendContactEmail.mockRejectedValue(new Error('SMTP down'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const app = buildApp({ emailService });

    const response = await request(app).post('/api/contact').send(validPayload);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true });
    consoleError.mockRestore();
  });

  it('returns 400 when the payload fails ContactSchema validation', async () => {
    const emailService = buildEmailService();
    const app = buildApp({ emailService });

    const response = await request(app)
      .post('/api/contact')
      .send({ ...validPayload, email: 'invalido' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'ValidationError' });
    expect(emailService.sendContactEmail).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload contains unknown keys (strict)', async () => {
    const emailService = buildEmailService();
    const app = buildApp({ emailService });

    const response = await request(app)
      .post('/api/contact')
      .send({ ...validPayload, extra: 'nope' });

    expect(response.status).toBe(400);
    expect(emailService.sendContactEmail).not.toHaveBeenCalled();
  });

  it('rejects a filled honeypot without touching the use case', async () => {
    const emailService = buildEmailService();
    const app = buildApp({ emailService });

    const response = await request(app)
      .post('/api/contact')
      .send({ ...validPayload, website: 'http://spam.cl' });

    expect(response.status).toBe(400);
    expect(emailService.sendContactEmail).not.toHaveBeenCalled();
  });

  it('accepts an empty honeypot field', async () => {
    const emailService = buildEmailService();
    const app = buildApp({ emailService });

    const response = await request(app)
      .post('/api/contact')
      .send({ ...validPayload, website: '' });

    expect(response.status).toBe(200);
    expect(emailService.sendContactEmail).toHaveBeenCalledTimes(1);
  });

  it('rate-limits a sixth submission from the same IP within a minute', async () => {
    const rateLimiter = new RateLimiter();
    // Un solo servidor para las seis peticiones: `request(app)` levanta uno efímero por
    // llamada, y seis seguidos hacían fallar el test por agotamiento de sockets, no por
    // el límite que se quiere probar.
    const server = openServer(
      buildApp({ emailService: buildEmailService(), rateLimiter }),
    );

    try {
      for (let i = 0; i < 5; i += 1) {
        const response = await request(server).post('/api/contact').send(validPayload);
        expect(response.status).toBe(200);
      }
      const response = await request(server).post('/api/contact').send(validPayload);

      expect(response.status).toBe(429);
      expect(response.headers['retry-after']).toBeDefined();
    } finally {
      server.close();
    }
  });

  it('keeps the rate limit separate per tenant even with a shared limiter and IP', async () => {
    const rateLimiter = new RateLimiter();
    const appTenantA = buildApp({
      emailService: buildEmailService(),
      rateLimiter,
      tenantId: '018f6f1a-0000-7000-8000-000000000001',
    });
    const appTenantB = buildApp({
      emailService: buildEmailService(),
      rateLimiter,
      tenantId: '018f6f1a-0000-7000-8000-000000000002',
    });

    const serverA = openServer(appTenantA);
    const serverB = openServer(appTenantB);

    try {
      for (let i = 0; i < 5; i += 1) {
        const response = await request(serverA).post('/api/contact').send(validPayload);
        expect(response.status).toBe(200);
      }
      const exhausted = await request(serverA).post('/api/contact').send(validPayload);
      expect(exhausted.status).toBe(429);

      const otherTenant = await request(serverB).post('/api/contact').send(validPayload);
      expect(otherTenant.status).toBe(200);
    } finally {
      serverA.close();
      serverB.close();
    }
  });
});
