import nodemailer, { type Transporter } from 'nodemailer';
import type { PasswordResetMailer } from '../domain/PasswordResetMailer';
import { SmtpConfig } from '../../Contact/infrastructure/SmtpEmailService';

export class SmtpPasswordResetMailer implements PasswordResetMailer {
  private readonly transporter: Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user !== '' ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  public async sendResetLink(
    email: string,
    name: string,
    resetUrl: string,
  ): Promise<void> {
    await this.send(email, 'Recupera tu contraseña', [
      `Hola ${name},`,
      '',
      'Recibimos una solicitud para cambiar la contraseña de tu panel.',
      'Abre este enlace para elegir una nueva:',
      resetUrl,
      '',
      'El enlace dura una hora y sirve una sola vez.',
      'Si no fuiste tú, ignora este correo: tu contraseña sigue igual.',
    ]);
  }

  public async sendInvitation(
    email: string,
    name: string,
    resetUrl: string,
  ): Promise<void> {
    await this.send(email, 'Te invitaron al panel', [
      `Hola ${name},`,
      '',
      'Te crearon una cuenta en el panel de administración.',
      'Abre este enlace para elegir tu contraseña:',
      resetUrl,
      '',
      'El enlace dura una hora y sirve una sola vez.',
    ]);
  }

  private async send(to: string, subject: string, lines: string[]): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to,
      subject,
      text: lines.join('\n'),
    });
  }
}
