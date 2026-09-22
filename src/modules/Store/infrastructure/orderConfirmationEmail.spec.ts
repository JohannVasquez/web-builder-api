import { Order, type OrderItemPrimitives } from '../domain/Order';
import type { OrderMailContext } from '../domain/OrderMailer';
import { SmtpOrderMailer } from './SmtpOrderMailer';
import { SmtpConfig } from '@/modules/Contact/infrastructure/SmtpEmailService';

interface SentMail {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

const ITEMS: OrderItemPrimitives[] = [
  {
    productId: 'prod-1',
    name: 'Torta de chocolate',
    quantity: 2,
    unitPriceCents: 19990,
    totalCents: 39980,
    variant: { Tamaño: '20 porciones' },
  },
];

const buildOrder = (overrides: Partial<{ shippingCents: number }> = {}): Order =>
  new Order(
    'order-1',
    '0007',
    'paid',
    { name: 'Ana Pérez', email: 'ana@ejemplo.cl', phone: '+56911112222' },
    {
      method: 'shipping',
      shippingCode: 'santiago',
      shippingName: 'Despacho en Santiago',
      addressLine: 'Av. Siempre Viva 742',
      addressCity: 'Santiago',
      addressRegion: 'RM',
      addressNotes: null,
    },
    ITEMS,
    39980,
    0,
    overrides.shippingCents ?? 3500,
    0,
    43480,
    'CLP',
    null,
    'transfer',
    null,
    null,
    new Date('2026-09-22T12:00:00.000Z'),
    new Date('2026-09-22T12:00:00.000Z'),
    '2026-01-01T00:00:00.000Z',
  );

const CONTEXT: OrderMailContext = {
  storeName: 'Pastelería Acme',
  seller: {
    legalName: 'Pastelería Acme SpA',
    taxId: '76086428-5',
    address: 'Av. Siempre Viva 742, Santiago',
    email: 'hola@acme.cl',
    phone: '+56912345678',
  },
  termsUrl: '/terminos-de-compra',
  termsVersion: '2026-01-01T00:00:00.000Z',
};

// El transporte se reemplaza para leer lo que se habría enviado, sin levantar SMTP.
const buildMailer = (): { mailer: SmtpOrderMailer; sent: SentMail[] } => {
  const sent: SentMail[] = [];
  const mailer = new SmtpOrderMailer(
    new SmtpConfig('localhost', 1025, false, '', '', 'tienda@acme.cl', 'acme@acme.cl'),
  );
  (
    mailer as unknown as { transporter: { sendMail: (mail: SentMail) => Promise<void> } }
  ).transporter = {
    sendMail: (mail: SentMail): Promise<void> => {
      sent.push(mail);
      return Promise.resolve();
    },
  };
  return { mailer, sent };
};

const confirmationFor = async (order = buildOrder()): Promise<string> => {
  const { mailer, sent } = buildMailer();
  await mailer.sendBuyerConfirmation(order, CONTEXT);
  return sent[0].text;
};

describe('confirmación de compra', () => {
  it('va al comprador, con el número de pedido en el asunto', async () => {
    const { mailer, sent } = buildMailer();

    await mailer.sendBuyerConfirmation(buildOrder(), CONTEXT);

    expect(sent[0].to).toBe('ana@ejemplo.cl');
    expect(sent[0].subject).toContain('0007');
  });

  it('detalla el precio unitario, no solo el total de la línea', async () => {
    // Sin él, quien compró varias unidades no puede comprobar el total ni reclamar.
    const text = await confirmationFor();

    expect(text).toContain('2 x Torta de chocolate');
    expect(text).toContain('$19.990 c/u');
    expect(text).toContain('$39.980');
  });

  it('informa el costo de despacho también cuando es gratis', async () => {
    // "Gratis" es una condición de la compra, no la ausencia de una.
    expect(await confirmationFor(buildOrder({ shippingCents: 0 }))).toContain(
      'Envío: gratis',
    );
  });

  it('identifica a quién le compraste, con razón social y RUT', async () => {
    const text = await confirmationFor();

    expect(text).toContain('Pastelería Acme SpA');
    expect(text).toContain('RUT 76086428-5');
  });

  it('enlaza los términos vigentes al comprar, diciendo cuál versión eran', async () => {
    const text = await confirmationFor();

    expect(text).toContain('/terminos-de-compra');
    expect(text).toContain('2026-01-01T00:00:00.000Z');
  });

  it('informa el retracto de 10 días y cómo ejercerlo', async () => {
    const text = await confirmationFor();

    expect(text).toContain('Derecho a retracto');
    expect(text).toContain('10 días');
    expect(text).toContain('responde este correo');
  });

  it('una tienda sin términos no inventa un enlace roto', async () => {
    const { mailer, sent } = buildMailer();

    await mailer.sendBuyerConfirmation(buildOrder(), {
      ...CONTEXT,
      termsUrl: null,
      termsVersion: null,
    });

    expect(sent[0].text).not.toContain('Condiciones de esta compra');
    // El retracto se informa igual: no depende de que existan términos publicados.
    expect(sent[0].text).toContain('Derecho a retracto');
  });
});
