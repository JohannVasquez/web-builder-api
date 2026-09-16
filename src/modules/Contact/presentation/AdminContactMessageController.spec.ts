import express, { type Express } from 'express';
import request from 'supertest';
import { AdminContactMessageController } from './AdminContactMessageController';
import { createAdminContactMessageRouter } from './adminContactMessageRouter';
import { ListContactMessagesUseCase } from '../application/ListContactMessagesUseCase';
import { MarkContactMessageReadUseCase } from '../application/MarkContactMessageReadUseCase';
import type { ContactMessagePrimitives } from '../domain/ContactMessage';
import type { ContactMessageRepository } from '../domain/ContactMessageRepository';
import { ErrorHandler } from '../../../shared/presentation/ErrorHandler';

describe('AdminContactMessageController (HTTP)', () => {
  const buildMessage = (
    overrides: Partial<ContactMessagePrimitives> = {},
  ): ContactMessagePrimitives => ({
    id: 1,
    tenantId: 3,
    name: 'Johann Vasquez',
    email: 'johann@example.com',
    phone: null,
    message: 'Quiero más información sobre sus servicios.',
    emailedAt: null,
    emailError: null,
    readAt: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  const buildRepository = (): jest.Mocked<ContactMessageRepository> => ({
    save: jest.fn(),
    markEmailed: jest.fn(),
    markRead: jest.fn(),
    search: jest.fn().mockResolvedValue({ messages: [buildMessage()], total: 1 }),
  });

  const buildApp = (repository: ContactMessageRepository): Express => {
    const controller = new AdminContactMessageController(
      new ListContactMessagesUseCase(repository),
      new MarkContactMessageReadUseCase(repository),
    );
    const app = express();
    app.use(express.json());
    app.use(
      '/api/admin/tenants/:tenantId/messages',
      createAdminContactMessageRouter(controller),
    );
    app.use(new ErrorHandler().handle);
    return app;
  };

  it('lists the messages of the tenant in the route with the default paging', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app).get('/api/admin/tenants/3/messages');

    expect(response.status).toBe(200);
    expect(repository.search).toHaveBeenCalledWith({
      tenantId: 3,
      unreadOnly: false,
      limit: 50,
      offset: 0,
    });
    expect(response.body).toMatchObject({ total: 1 });
  });

  it('forwards unreadOnly, limit and offset from the query string', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app).get(
      '/api/admin/tenants/3/messages?limit=10&offset=5',
    );

    expect(response.status).toBe(200);
    expect(repository.search).toHaveBeenCalledWith({
      tenantId: 3,
      unreadOnly: false,
      limit: 10,
      offset: 5,
    });
  });

  it('coerces the unreadOnly query string into a boolean', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app).get(
      '/api/admin/tenants/3/messages?unreadOnly=true',
    );

    expect(response.status).toBe(200);
    expect(repository.search).toHaveBeenCalledWith(
      expect.objectContaining({ unreadOnly: true }),
    );
  });

  it('marks a message as read', async () => {
    const repository = buildRepository();
    repository.markRead.mockResolvedValue(
      buildMessage({ readAt: '2024-02-01T00:00:00.000Z' }),
    );
    const app = buildApp(repository);

    const response = await request(app)
      .patch('/api/admin/tenants/3/messages/1')
      .send({ read: true });

    expect(response.status).toBe(200);
    expect(repository.markRead).toHaveBeenCalledWith(3, 1, true);
    expect((response.body as { message: ContactMessagePrimitives }).message.readAt).toBe(
      '2024-02-01T00:00:00.000Z',
    );
  });

  it('returns 400 for an unknown field in the body (strict schema)', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app)
      .patch('/api/admin/tenants/3/messages/1')
      .send({ read: true, isSpam: true });

    expect(response.status).toBe(400);
    expect(repository.markRead).not.toHaveBeenCalled();
  });

  it('returns 404 when the message does not belong to this tenant', async () => {
    const repository = buildRepository();
    repository.markRead.mockResolvedValue(null);
    const app = buildApp(repository);

    const response = await request(app)
      .patch('/api/admin/tenants/3/messages/999')
      .send({ read: true });

    expect(response.status).toBe(404);
  });

  it('exports the messages as a downloadable CSV with a header row', async () => {
    const repository = buildRepository();
    const app = buildApp(repository);

    const response = await request(app).get('/api/admin/tenants/3/messages/export.csv');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment');
    const lines = response.text.split('\n');
    expect(lines[0]).toBe('"fecha","nombre","correo","telefono","mensaje","leido"');
    expect(lines).toHaveLength(2);
  });

  it('escapes double quotes inside a message so the CSV stays valid', async () => {
    const repository = buildRepository();
    repository.search.mockResolvedValue({
      messages: [buildMessage({ message: 'Dijo "hola"' })],
      total: 1,
    });
    const app = buildApp(repository);

    const response = await request(app).get('/api/admin/tenants/3/messages/export.csv');

    const [, row] = response.text.split('\n');
    expect(row).toBe(
      '"2024-01-01T00:00:00.000Z","Johann Vasquez","johann@example.com","","Dijo ""hola""","no"',
    );
  });
});
