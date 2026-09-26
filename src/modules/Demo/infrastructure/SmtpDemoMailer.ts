import nodemailer, { type Transporter } from 'nodemailer';
import { SmtpConfig } from '@/modules/Contact/infrastructure/SmtpEmailService';
import type { DemoExpiryWarningMail, DemoMailer } from '../domain/DemoMailer';

// La agencia vende en Chile: la fecha que lee el prospecto es la de su calendario, no la UTC.
const DATE_FORMAT = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Santiago',
});

// El nombre lo escribió quien cargó la ficha: sin saltos ni caracteres de control, para que no
// pueda partir el asunto ni inventar líneas en el cuerpo.
const oneLine = (value: string): string =>
  value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export interface ExpiryWarningEmail {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

export const buildExpiryWarningEmail = (
  mail: Pick<DemoExpiryWarningMail, 'businessName' | 'expiresAt'>,
): ExpiryWarningEmail => {
  const business = oneLine(mail.businessName);
  const date = DATE_FORMAT.format(mail.expiresAt);
  // Sin el enlace: el token no se guarda en claro, y reenviarlo por correo lo expondría más.
  const paragraphs = [
    'Hola,',
    `Tu propuesta de sitio para ${business} está disponible hasta el ${date}.`,
    'Puedes volver a verla con el mismo enlace que te enviamos.',
    'Si te interesa o necesitas más tiempo para revisarla, responde este correo y lo conversamos.',
  ];
  return {
    subject: `Tu propuesta de sitio para ${business} vence el ${date}`,
    text: paragraphs.join('\n\n'),
    html: paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n'),
  };
};

export class SmtpDemoMailer implements DemoMailer {
  private readonly transporter: Transporter;

  constructor(
    private readonly config: SmtpConfig,
    // A quién le llega la respuesta del prospecto: la agencia, no la casilla de envío.
    private readonly replyTo: string,
  ) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user !== '' ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  public async sendExpiryWarning(mail: DemoExpiryWarningMail): Promise<void> {
    const email = buildExpiryWarningEmail(mail);
    await this.transporter.sendMail({
      from: this.config.from,
      to: mail.to,
      replyTo: this.replyTo === '' ? this.config.from : this.replyTo,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  }
}
