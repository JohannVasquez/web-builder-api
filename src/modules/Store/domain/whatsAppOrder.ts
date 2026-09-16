import { effectivePriceCents, formatMoney } from './money';

export interface WhatsAppOrderInput {
  readonly whatsappNumber: string;
  readonly productName: string;
  readonly priceCents: number;
  readonly salePriceCents: number | null;
  readonly currency: string;
  readonly selectedOptions?: Readonly<Record<string, string>>;
  readonly quantity?: number;
  readonly siteName?: string;
}

// `wa.me` exige solo dígitos: un `+56 9 1234 5678` pegado tal cual no abre la conversación.
const normalizeNumber = (value: string): string => value.replace(/\D/g, '');

// Lo que da valor a la etapa 1: el mensaje llega escrito, así que el dueño del negocio
// recibe un pedido entendible en vez de un "hola, precio?".
export const buildWhatsAppOrderUrl = (input: WhatsAppOrderInput): string | null => {
  const number = normalizeNumber(input.whatsappNumber);
  if (number === '') {
    return null;
  }

  const quantity = input.quantity ?? 1;
  const price = formatMoney(
    effectivePriceCents(input.priceCents, input.salePriceCents),
    input.currency,
  );

  const options = Object.entries(input.selectedOptions ?? {})
    .filter(([, value]) => value !== '')
    .map(([name, value]) => `${name}: ${value}`);

  const lines = [
    `Hola${input.siteName === undefined ? '' : ` ${input.siteName}`}, quiero pedir:`,
    '',
    `• ${input.productName}`,
    ...options.map((option) => `  ${option}`),
    ...(quantity > 1 ? [`  Cantidad: ${String(quantity)}`] : []),
    `  Precio: ${price}`,
  ];

  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`;
};
