import nodemailer, { type Transporter } from 'nodemailer';
import type { Order } from '../domain/Order';
import type { OrderMailer } from '../domain/OrderMailer';
import { SmtpConfig } from '@/modules/Contact/infrastructure/SmtpEmailService';
import { formatMoney } from '../domain/money';

export class SmtpOrderMailer implements OrderMailer {
  private readonly transporter: Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user !== '' ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  public async sendBuyerConfirmation(order: Order, storeName: string): Promise<void> {
    await this.send(order.customer.email, `Tu pedido ${order.number} en ${storeName}`, [
      `Hola ${order.customer.name},`,
      '',
      `Recibimos tu pedido ${order.number}. Esto es lo que compraste:`,
      '',
      ...this.itemLines(order),
      '',
      ...this.totalLines(order),
      '',
      order.delivery.method === 'pickup'
        ? 'Retiras en tienda. Te avisamos cuando esté listo.'
        : `Despachamos a ${order.delivery.addressLine ?? 'la dirección que nos diste'}.`,
      '',
      `Gracias por comprar en ${storeName}.`,
    ]);
  }

  public async sendOwnerNotice(
    order: Order,
    storeName: string,
    recipient: string,
  ): Promise<void> {
    await this.send(recipient, `Nuevo pedido ${order.number} en ${storeName}`, [
      `Pedido ${order.number} pagado.`,
      '',
      `Comprador: ${order.customer.name}`,
      `Correo: ${order.customer.email}`,
      `Teléfono: ${order.customer.phone}`,
      '',
      ...this.itemLines(order),
      '',
      ...this.totalLines(order),
      '',
      order.delivery.method === 'pickup'
        ? 'Retira en tienda.'
        : [
            'Despacho:',
            order.delivery.shippingName ?? '',
            order.delivery.addressLine ?? '',
            [order.delivery.addressCity, order.delivery.addressRegion]
              .filter((part) => part !== null && part !== '')
              .join(', '),
            order.delivery.addressNotes ?? '',
          ]
            .filter((line) => line !== '')
            .join('\n'),
    ]);
  }

  private itemLines(order: Order): string[] {
    return order.items.map((item) => {
      const variant = Object.entries(item.variant)
        .map(([name, value]) => `${name}: ${value}`)
        .join(', ');
      const suffix = variant === '' ? '' : ` (${variant})`;
      return `- ${String(item.quantity)} x ${item.name}${suffix} — ${formatMoney(item.totalCents, order.currency)}`;
    });
  }

  private totalLines(order: Order): string[] {
    return [
      `Subtotal: ${formatMoney(order.subtotalCents, order.currency)}`,
      ...(order.discountCents > 0
        ? [
            `Descuento${order.couponCode === null ? '' : ` (${order.couponCode})`}: -${formatMoney(order.discountCents, order.currency)}`,
          ]
        : []),
      ...(order.shippingCents > 0
        ? [`Envío: ${formatMoney(order.shippingCents, order.currency)}`]
        : []),
      `Total: ${formatMoney(order.totalCents, order.currency)}`,
    ];
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
