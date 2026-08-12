import express, { type Express } from 'express';
import request from 'supertest';
import { ContactController } from './ContactController';
import { SendContactEmailUseCase } from '../application/SendContactEmailUseCase';
import type { EmailService } from '../domain/EmailService';
import { createContactRouter } from './contactRouter';
import { ErrorHandler } from '../../../shared/presentation/ErrorHandler';

describe('ContactController (HTTP)', () => {
  const buildApp = (emailService: EmailService): Express => {
    const app = express();
    app.use(express.json());
    const controller = new ContactController(new SendContactEmailUseCase(emailService));
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
    const emailService: jest.Mocked<EmailService> = {
      sendContactEmail: jest.fn().mockResolvedValue(undefined),
    };
    const app = buildApp(emailService);

    const response = await request(app).post('/api/contact').send(validPayload);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true });
    expect(emailService.sendContactEmail).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when the payload fails ContactSchema validation', async () => {
    const emailService: jest.Mocked<EmailService> = {
      sendContactEmail: jest.fn(),
    };
    const app = buildApp(emailService);

    const response = await request(app)
      .post('/api/contact')
      .send({ ...validPayload, email: 'invalido' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'ValidationError' });
    expect(emailService.sendContactEmail).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload contains unknown keys (strict)', async () => {
    const emailService: jest.Mocked<EmailService> = {
      sendContactEmail: jest.fn(),
    };
    const app = buildApp(emailService);

    const response = await request(app)
      .post('/api/contact')
      .send({ ...validPayload, extra: 'nope' });

    expect(response.status).toBe(400);
    expect(emailService.sendContactEmail).not.toHaveBeenCalled();
  });
});
