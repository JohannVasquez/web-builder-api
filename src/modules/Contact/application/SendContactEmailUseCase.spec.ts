import { GlobalSettings } from '../../GlobalSettings/domain/GlobalSettings';
import type { GlobalSettingsRepository } from '../../GlobalSettings/domain/GlobalSettingsRepository';
import { SendContactEmailUseCase } from './SendContactEmailUseCase';
import { ContactRequest } from '../domain/ContactRequest';
import { ContactSchema } from '../domain/ContactSchema';
import type { EmailService } from '../domain/EmailService';

describe('SendContactEmailUseCase', () => {
  const TENANT_ID = 7;

  const buildEmailService = (): jest.Mocked<EmailService> => ({
    sendContactEmail: jest.fn().mockResolvedValue(undefined),
  });

  const buildSettingsRepository = (
    contactEmail: string,
  ): jest.Mocked<GlobalSettingsRepository> => ({
    find: jest.fn().mockResolvedValue(GlobalSettings.fromRecord({ contactEmail })),
  });

  it('dispatches an email with the contact data to the tenant mailbox', async () => {
    const emailService = buildEmailService();
    const settingsRepository = buildSettingsRepository('ventas@electroandes.cl');
    const useCase = new SendContactEmailUseCase(emailService, settingsRepository);

    await useCase.execute(
      {
        name: 'Johann Vasquez',
        email: 'johann@example.com',
        phone: '+56912345678',
        message: 'Quiero cotizar una landing page para mi negocio.',
      },
      TENANT_ID,
    );

    expect(settingsRepository.find).toHaveBeenCalledWith(TENANT_ID);
    expect(emailService.sendContactEmail).toHaveBeenCalledTimes(1);
    const [contact, recipient] = emailService.sendContactEmail.mock.calls[0] ?? [];
    expect(contact).toBeInstanceOf(ContactRequest);
    expect(contact?.email).toBe('johann@example.com');
    expect(recipient).toBe('ventas@electroandes.cl');
  });

  it('omits the recipient when the tenant has no contactEmail configured', async () => {
    const emailService = buildEmailService();
    const settingsRepository = buildSettingsRepository('');
    const useCase = new SendContactEmailUseCase(emailService, settingsRepository);

    await useCase.execute(
      {
        name: 'Johann Vasquez',
        email: 'johann@example.com',
        message: 'Mensaje suficientemente largo.',
      },
      TENANT_ID,
    );

    const recipient = emailService.sendContactEmail.mock.calls[0]?.[1];
    expect(recipient).toBeUndefined();
  });

  it('propagates errors from the email service', async () => {
    const emailService = buildEmailService();
    emailService.sendContactEmail.mockRejectedValue(new Error('SMTP down'));
    const useCase = new SendContactEmailUseCase(
      emailService,
      buildSettingsRepository('ventas@electroandes.cl'),
    );

    await expect(
      useCase.execute(
        {
          name: 'Johann Vasquez',
          email: 'johann@example.com',
          message: 'Mensaje suficientemente largo.',
        },
        TENANT_ID,
      ),
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
