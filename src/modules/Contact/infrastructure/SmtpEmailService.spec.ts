import { SmtpConfig, SmtpEmailService } from './SmtpEmailService';
import { ContactRequest } from '../domain/ContactRequest';
import nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('SmtpEmailService', () => {
  const config = new SmtpConfig(
    'smtp.example.com',
    587,
    false,
    'user',
    'pass',
    'no-reply@example.com',
    'default@example.com',
  );

  type MockSendMail = jest.Mock<Promise<void>, [nodemailer.SendMailOptions]>;
  const mockSendMail = jest.fn() as MockSendMail;
  mockSendMail.mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });
  });

  const validContact = ContactRequest.fromInput({
    name: 'Johann Vasquez',
    email: 'johann@example.com',
    message: 'Mensaje de prueba.',
  });

  it('sends an email including the siteName in the subject and body', async () => {
    const service = new SmtpEmailService(config);

    await service.sendContactEmail(validContact, 'dest@example.com', 'Electro Andes');

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailOptions = mockSendMail.mock.calls[0]?.[0];

    expect(mailOptions?.to).toBe('dest@example.com');
    expect(mailOptions?.subject).toBe('Nuevo mensaje de contacto en Electro Andes de Johann Vasquez');
    expect(mailOptions?.text).toContain('Mensaje recibido desde: Electro Andes');
    expect(mailOptions?.text).toContain('Nombre: Johann Vasquez');
  });

  it('uses a fallback for siteName when not provided or empty', async () => {
    const service = new SmtpEmailService(config);

    // Sin siteName
    await service.sendContactEmail(validContact, 'dest@example.com');

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    let mailOptions = mockSendMail.mock.calls[0]?.[0];
    expect(mailOptions?.subject).toBe('Nuevo mensaje de contacto en Sitio Web de Johann Vasquez');
    expect(mailOptions?.text).toContain('Mensaje recibido desde: Sitio Web');

    // Con siteName vacío
    await service.sendContactEmail(validContact, 'dest@example.com', '   ');

    expect(mockSendMail).toHaveBeenCalledTimes(2);
    mailOptions = mockSendMail.mock.calls[1]?.[0];
    expect(mailOptions?.subject).toBe('Nuevo mensaje de contacto en Sitio Web de Johann Vasquez');
    expect(mailOptions?.text).toContain('Mensaje recibido desde: Sitio Web');
  });
});
