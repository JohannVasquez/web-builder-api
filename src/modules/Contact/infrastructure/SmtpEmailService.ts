import nodemailer, { type Transporter } from 'nodemailer';
import type { ContactRequest } from '../domain/ContactRequest';
import type { EmailService } from '../domain/EmailService';

export interface SmtpConfig {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly user: string;
  readonly pass: string;
  readonly from: string;
  readonly to: string;
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
