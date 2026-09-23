import nodemailer, { type Transporter } from 'nodemailer';
import { SmtpConfig } from '@/modules/Contact/infrastructure/SmtpEmailService';
import type { DataRightsMailer } from '../domain/DataRightsMailer';
import { VERIFICATION_HOURS, type DataRight } from '../domain/DataRightsRequest';
import type { PersonalDataExport } from '../domain/DataRightsRepository';

const RIGHT_LABELS: Readonly<Record<DataRight, string>> = {
  acceso: 'acceder a tus datos',
  rectificacion: 'corregir tus datos',
  cancelacion: 'eliminar tus datos',
  oposicion: 'oponerte al tratamiento de tus datos',
  portabilidad: 'llevarte tus datos',
};

export class SmtpDataRightsMailer implements DataRightsMailer {
  private readonly transporter: Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user !== '' ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  public async sendVerification(
    email: string,
    right: DataRight,
    verifyUrl: string,
  ): Promise<void> {
    await this.send(email, 'Confirma tu solicitud sobre tus datos', [
      'Recibimos una solicitud para ' + RIGHT_LABELS[right] + '.',
      '',
      'Para confirmar que eres tú, abre este enlace:',
      verifyUrl,
      '',
      `El enlace dura ${VERIFICATION_HOURS} horas y sirve una sola vez.`,
      'Si no fuiste tú, ignora este correo: no haremos nada.',
    ]);
  }

  public async sendExport(email: string, data: PersonalDataExport): Promise<void> {
    // Adjunto y no cuerpo: es un formato estructurado, que es lo que la portabilidad exige.
    await this.transporter.sendMail({
      from: this.config.from,
      to: email,
      subject: 'Tus datos personales',
      text: [
        'Adjuntamos todo lo que guardamos de ti en este sitio, en formato JSON.',
        '',
        'Si algo está mal, respóndenos y lo corregimos.',
      ].join('\n'),
      attachments: [
        {
          filename: 'mis-datos.json',
          content: JSON.stringify(data, null, 2),
          contentType: 'application/json',
        },
      ],
    });
  }

  public async sendErasureDone(email: string): Promise<void> {
    await this.send(email, 'Eliminamos tus datos', [
      'Listo: eliminamos los datos personales que teníamos de ti.',
      '',
      'Conservamos el respaldo de las compras que hayas hecho, sin los datos que te',
      'identifican, porque la normativa tributaria y de consumo obliga a guardarlo.',
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
