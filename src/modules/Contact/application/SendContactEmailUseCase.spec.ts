import { GlobalSettings } from '@/modules/GlobalSettings/domain/GlobalSettings';
import type { GlobalSettingsRepository } from '@/modules/GlobalSettings/domain/GlobalSettingsRepository';
import { SendContactEmailUseCase } from './SendContactEmailUseCase';
import { ContactRequest } from '../domain/ContactRequest';
import { ContactSchema } from '../domain/ContactSchema';
import type { ContactMessagePrimitives } from '../domain/ContactMessage';
import type { ContactMessageRepository } from '../domain/ContactMessageRepository';
import type { EmailService } from '../domain/EmailService';

describe('SendContactEmailUseCase', () => {
  const TENANT_ID = '018f6f1a-0000-7000-8000-000000000007';
  const STORED_ID = '018f6f1a-0000-7000-8000-000000000042';

  const validInput = {
    name: 'Johann Vasquez',
    email: 'johann@example.com',
    message: 'Quiero cotizar una landing page para mi negocio.',
  };

  const buildStoredMessage = (): ContactMessagePrimitives => ({
    id: STORED_ID,
    tenantId: TENANT_ID,
    name: validInput.name,
    email: validInput.email,
    phone: null,
    message: validInput.message,
    emailedAt: null,
    emailError: null,
    readAt: null,
    createdAt: new Date().toISOString(),
  });

  const buildEmailService = (): jest.Mocked<EmailService> => ({
    sendContactEmail: jest.fn().mockResolvedValue(undefined),
  });

  const buildSettingsRepository = (
    contactEmail: string,
    siteName: string = '',
  ): jest.Mocked<GlobalSettingsRepository> => ({
    upsert: jest.fn(),
    find: jest.fn().mockResolvedValue(GlobalSettings.fromRecord({ contactEmail, siteName })),
  });

  const buildContactMessageRepository = (): jest.Mocked<ContactMessageRepository> => ({
    save: jest.fn().mockResolvedValue(buildStoredMessage()),
    markEmailed: jest.fn().mockResolvedValue(undefined),
    markRead: jest.fn(),
    search: jest.fn(),
  });

  it('dispatches an email with the contact data to the tenant mailbox', async () => {
    const emailService = buildEmailService();
    const settingsRepository = buildSettingsRepository('ventas@electroandes.cl', 'Electro Andes');
    const contactMessageRepository = buildContactMessageRepository();
    const useCase = new SendContactEmailUseCase(
      emailService,
      settingsRepository,
      contactMessageRepository,
    );

    await useCase.execute({ ...validInput, phone: '+56912345678' }, TENANT_ID);

    expect(settingsRepository.find).toHaveBeenCalledWith(TENANT_ID);
    expect(emailService.sendContactEmail).toHaveBeenCalledTimes(1);
    const [contact, recipient, siteName] = emailService.sendContactEmail.mock.calls[0] ?? [];
    expect(contact).toBeInstanceOf(ContactRequest);
    expect(contact?.email).toBe('johann@example.com');
    expect(recipient).toBe('ventas@electroandes.cl');
    expect(siteName).toBe('Electro Andes');
  });

  it('stores the message before attempting to send the email', async () => {
    const emailService = buildEmailService();
    const contactMessageRepository = buildContactMessageRepository();
    const useCase = new SendContactEmailUseCase(
      emailService,
      buildSettingsRepository('ventas@electroandes.cl'),
      contactMessageRepository,
    );

    await useCase.execute(validInput, TENANT_ID);

    const saveOrder = contactMessageRepository.save.mock.invocationCallOrder[0];
    const sendOrder = emailService.sendContactEmail.mock.invocationCallOrder[0];
    expect(saveOrder).toBeLessThan(sendOrder);
  });

  it('marks the message as emailed and reports success when the email is sent', async () => {
    const emailService = buildEmailService();
    const contactMessageRepository = buildContactMessageRepository();
    const useCase = new SendContactEmailUseCase(
      emailService,
      buildSettingsRepository('ventas@electroandes.cl'),
      contactMessageRepository,
    );

    const result = await useCase.execute(validInput, TENANT_ID);

    expect(contactMessageRepository.markEmailed).toHaveBeenCalledWith(STORED_ID, null);
    expect(result).toEqual({ stored: true, emailed: true });
  });

  it('does not throw when the email fails: the contact is never lost', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const emailService = buildEmailService();
    emailService.sendContactEmail.mockRejectedValue(new Error('SMTP down'));
    const contactMessageRepository = buildContactMessageRepository();
    const useCase = new SendContactEmailUseCase(
      emailService,
      buildSettingsRepository('ventas@electroandes.cl'),
      contactMessageRepository,
    );

    const result = await useCase.execute(validInput, TENANT_ID);

    expect(result).toEqual({ stored: true, emailed: false });
    expect(contactMessageRepository.markEmailed).toHaveBeenCalledWith(
      STORED_ID,
      'SMTP down',
    );
    consoleError.mockRestore();
  });

  it('normalizes several recipients into a single comma-separated string', async () => {
    const emailService = buildEmailService();
    const useCase = new SendContactEmailUseCase(
      emailService,
      buildSettingsRepository('a@x.cl, b@x.cl'),
      buildContactMessageRepository(),
    );

    await useCase.execute(validInput, TENANT_ID);

    const recipient = emailService.sendContactEmail.mock.calls[0]?.[1];
    expect(recipient).toBe('a@x.cl, b@x.cl');
  });

  it('omits the recipient when the tenant has no contactEmail configured', async () => {
    const emailService = buildEmailService();
    const useCase = new SendContactEmailUseCase(
      emailService,
      buildSettingsRepository(''),
      buildContactMessageRepository(),
    );

    await useCase.execute(validInput, TENANT_ID);

    const recipient = emailService.sendContactEmail.mock.calls[0]?.[1];
    expect(recipient).toBeUndefined();
  });

  it('omits the recipient when contactEmail only has separators', async () => {
    const emailService = buildEmailService();
    const useCase = new SendContactEmailUseCase(
      emailService,
      buildSettingsRepository('  ,  '),
      buildContactMessageRepository(),
    );

    await useCase.execute(validInput, TENANT_ID);

    const recipient = emailService.sendContactEmail.mock.calls[0]?.[1];
    expect(recipient).toBeUndefined();
  });

  it('skips sending the email when called in preview mode, but marks it as a test', async () => {
    const emailService = buildEmailService();
    const contactMessageRepository = buildContactMessageRepository();
    const useCase = new SendContactEmailUseCase(
      emailService,
      buildSettingsRepository('ventas@electroandes.cl'),
      contactMessageRepository,
    );

    const result = await useCase.execute(validInput, TENANT_ID, true);

    expect(emailService.sendContactEmail).not.toHaveBeenCalled();
    expect(contactMessageRepository.save).toHaveBeenCalled();
    expect(contactMessageRepository.markEmailed).toHaveBeenCalledWith(
      STORED_ID,
      'No enviado (Vista previa)'
    );
    expect(result).toEqual({ stored: true, emailed: false });
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
