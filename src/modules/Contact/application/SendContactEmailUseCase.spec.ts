import { SendContactEmailUseCase } from './SendContactEmailUseCase';
import { ContactRequest } from '../domain/ContactRequest';
import { ContactSchema } from '../domain/ContactSchema';
import type { EmailService } from '../domain/EmailService';

describe('SendContactEmailUseCase', () => {
  const buildEmailService = (): jest.Mocked<EmailService> => ({
    sendContactEmail: jest.fn().mockResolvedValue(undefined),
  });

  it('dispatches an email with the contact data', async () => {
    const emailService = buildEmailService();
    const useCase = new SendContactEmailUseCase(emailService);

    await useCase.execute({
      name: 'Johann Vasquez',
      email: 'johann@example.com',
      phone: '+56912345678',
      message: 'Quiero cotizar una landing page para mi negocio.',
    });

    expect(emailService.sendContactEmail).toHaveBeenCalledTimes(1);
    const contact = emailService.sendContactEmail.mock.calls[0]?.[0];
    expect(contact).toBeInstanceOf(ContactRequest);
    expect(contact?.email).toBe('johann@example.com');
  });

  it('propagates errors from the email service', async () => {
    const emailService = buildEmailService();
    emailService.sendContactEmail.mockRejectedValue(new Error('SMTP down'));
    const useCase = new SendContactEmailUseCase(emailService);

    await expect(
      useCase.execute({
        name: 'Johann Vasquez',
        email: 'johann@example.com',
        message: 'Mensaje suficientemente largo.',
      }),
    ).rejects.toThrow('SMTP down');
  });

  describe('ContactSchema', () => {
    it('rejects payloads with unknown keys (strict mode)', () => {
      const result = ContactSchema.safeParse({
        name: 'Johann',
        email: 'johann@example.com',
        message: 'Mensaje suficientemente largo.',
        isAdmin: true,
      });

      expect(result.success).toBe(false);
    });

    it('rejects invalid emails and short messages', () => {
      const result = ContactSchema.safeParse({
        name: 'J',
        email: 'no-es-un-correo',
        message: 'corto',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((issue) => issue.path.join('.'));
        expect(paths).toEqual(expect.arrayContaining(['name', 'email', 'message']));
      }
    });
  });
});
