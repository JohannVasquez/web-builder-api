import nodemailer, { type Transporter } from 'nodemailer';
import { SmtpConfig } from '@/modules/Contact/infrastructure/SmtpEmailService';
import type { ConsumerClaimMailer } from '../domain/ConsumerClaimMailer';
import type { ConsumerClaim } from '../domain/ConsumerClaim';

export class SmtpConsumerClaimMailer implements ConsumerClaimMailer {
  private readonly transporter: Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user !== '' ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  public async notifySeller(claim: ConsumerClaim, sellerEmail: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: sellerEmail,
      subject: `Nuevo ${claim.kind} registrado`,
      text: `Tienes un nuevo ${claim.kind} de ${claim.email}.
      
Pedido: ${claim.orderNumber ?? 'N/A'}
Mensaje:
${claim.message}`,
    });
  }

  public async sendAcknowledgmentToBuyer(claim: ConsumerClaim, storeName: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: claim.email,
      subject: `Acuse de recibo de tu ${claim.kind} en ${storeName}`,
      text: `Hemos recibido tu ${claim.kind}.

Detalles de tu solicitud:
Pedido: ${claim.orderNumber ?? 'N/A'}
Mensaje:
${claim.message}

Nos pondremos en contacto contigo dentro de los plazos legales.
Gracias,
${storeName}`,
    });
  }
}
