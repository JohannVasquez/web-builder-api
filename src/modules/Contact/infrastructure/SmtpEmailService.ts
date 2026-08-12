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

  public async sendContactEmail(contact: ContactRequest): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: this.config.to,
      replyTo: contact.email,
      subject: `Nuevo mensaje de contacto de ${contact.name}`,
      text: this.buildBody(contact),
    });
  }

  private buildBody(contact: ContactRequest): string {
    return [
      `Nombre: ${contact.name}`,
      `Email: ${contact.email}`,
      `Teléfono: ${contact.phone ?? 'No informado'}`,
      '',
      'Mensaje:',
      contact.message,
    ].join('\n');
  }
}
