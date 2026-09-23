import nodemailer, { type Transporter } from 'nodemailer';
import type { Order } from '../domain/Order';
import type { OrderMailContext, OrderMailer } from '../domain/OrderMailer';
import { RETRACTO_TEXTO } from '../domain/consumerRights';
import { sellerLines } from '../domain/StoreSettings';
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

  /**
   * Es la constancia escrita de la compra que exige la Ley 19.496, así que lleva TODO lo que
   * hace falta para reclamar después: el detalle con precios unitarios, quién vendió, las
   * condiciones vigentes al comprar y el derecho a retracto. Un correo que solo diga "gracias"
   * no sirve como constancia.
   */
  public async sendBuyerConfirmation(
    order: Order,
    context: OrderMailContext,
  ): Promise<void> {
    const seller = sellerLines(context.seller);

    await this.send(
      order.customer.email,
      `Tu pedido ${order.number} en ${context.storeName}`,
      [
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
        ...(seller.length === 0 ? [] : ['Vendido por:', ...seller, '']),
        ...(context.termsUrl === null
          ? []
          : [
              'Condiciones de esta compra:',
              context.termsUrl,
              ...(context.termsVersion === null
                ? []
                : [`(versión vigente al comprar: ${context.termsVersion})`]),
              '',
            ]),
        ...RETRACTO_TEXTO,
        '',
        `Gracias por comprar en ${context.storeName}.`,
      ],
    );
  }

  public async sendOwnerNotice(
    order: Order,
    context: OrderMailContext,
    recipient: string,
  ): Promise<void> {
    await this.send(recipient, `Nuevo pedido ${order.number} en ${context.storeName}`, [
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
      // El precio unitario va explícito: sin él, quien compró varias unidades no puede
      // comprobar el total ni reclamar una diferencia.
      const unit = formatMoney(item.unitPriceCents, order.currency);
      const total = formatMoney(item.totalCents, order.currency);
      return `- ${String(item.quantity)} x ${item.name}${suffix} — ${unit} c/u — ${total}`;
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
      // El costo de despacho se informa siempre, también cuando es cero: "gratis" es una
      // condición de la compra, no la ausencia de una.
      order.delivery.method === 'pickup'
        ? 'Retiro en tienda: sin costo de despacho'
        : `Envío: ${order.shippingCents === 0 ? 'gratis' : formatMoney(order.shippingCents, order.currency)}`,
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
