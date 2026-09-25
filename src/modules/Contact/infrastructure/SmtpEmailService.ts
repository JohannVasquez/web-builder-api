import nodemailer, { type Transporter } from 'nodemailer';
import type { ContactRequest } from '../domain/ContactRequest';
import type { EmailService } from '../domain/EmailService';

/**
 * Clase (no interface) para poder registrarse como token resoluble por diod
 * y ser inyectada explícitamente en el constructor de `SmtpEmailService`
 * (ver `withDependencies` en la raíz de composición).
 */
export class SmtpConfig {
  constructor(
    public readonly host: string,
    public readonly port: number,
    public readonly secure: boolean,
    public readonly user: string,
    public readonly pass: string,
    public readonly from: string,
    public readonly to: string,
  ) {}
}

export class SmtpEmailService implements EmailService {
  private readonly transporter: Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user !== '' ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  public async sendContactEmail(
    contact: ContactRequest,
    recipient?: string,
    siteName?: string,
  ): Promise<void> {
    // Si no hay siteName, usamos un valor genérico para que no quede roto
    const site = siteName && siteName.trim() !== '' ? siteName : 'Sitio Web';
    await this.transporter.sendMail({
      from: this.config.from,
      to: recipient ?? this.config.to,
      replyTo: contact.email,
      subject: `Nuevo mensaje de contacto en ${site} de ${contact.name}`,
      text: this.buildBody(contact, site),
    });
  }

  private buildBody(contact: ContactRequest, siteName: string): string {
    return [
      `Mensaje recibido desde: ${siteName}`,
      `Nombre: ${contact.name}`,
      `Email: ${contact.email}`,
      `Teléfono: ${contact.phone ?? 'No informado'}`,
      '',
      'Mensaje:',
      contact.message,
    ].join('\n');
  }
}
