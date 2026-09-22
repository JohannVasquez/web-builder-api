import type { ShippingOption } from './StoreSettings';

export interface PricedLine {
  readonly productId: string;
  readonly name: string;
  readonly variant: Readonly<Record<string, string>>;
  readonly unitPriceCents: number;
  readonly quantity: number;
  readonly totalCents: number;
}

export interface CartTotals {
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly shippingCents: number;
  readonly totalCents: number;
  readonly taxCents: number;
}

export interface TotalsInput {
  readonly lines: readonly PricedLine[];
  readonly discountCents: number;
  readonly shipping: ShippingOption | null;
  readonly freeShippingThresholdCents: number | null;
  readonly taxIncluded: boolean;
  readonly taxRatePercent: number;
}

export const lineTotal = (unitPriceCents: number, quantity: number): number =>
  unitPriceCents * quantity;

// El envío gratis se decide sobre lo que la persona realmente paga por los productos:
// si no, un cupón grande podría regalar el despacho.
export const shippingCostFor = (
  shipping: ShippingOption | null,
  payableCents: number,
  freeShippingThresholdCents: number | null,
): number => {
  if (shipping === null) {
    return 0;
  }
  if (freeShippingThresholdCents !== null && payableCents >= freeShippingThresholdCents) {
    return 0;
  }
  return shipping.priceCents;
};

// Con precios con IVA incluido (lo normal en Chile) el impuesto no se suma: se despeja
// del total para poder informarlo. Con precios sin IVA, se suma al final.
export const taxFor = (
  totalCents: number,
  taxIncluded: boolean,
  taxRatePercent: number,
): number => {
  if (taxRatePercent <= 0) {
    return 0;
  }
  if (taxIncluded) {
    return Math.round((totalCents * taxRatePercent) / (100 + taxRatePercent));
  }
  return Math.round((totalCents * taxRatePercent) / 100);
};

export const calculateTotals = (input: TotalsInput): CartTotals => {
  const subtotalCents = input.lines.reduce((sum, line) => sum + line.totalCents, 0);
  const discountCents = Math.max(0, Math.min(input.discountCents, subtotalCents));
  const payableCents = subtotalCents - discountCents;
  const shippingCents = shippingCostFor(
    input.shipping,
    payableCents,
    input.freeShippingThresholdCents,
  );
  const beforeTax = payableCents + shippingCents;
  const taxCents = taxFor(beforeTax, input.taxIncluded, input.taxRatePercent);
  const totalCents = input.taxIncluded ? beforeTax : beforeTax + taxCents;

  return { subtotalCents, discountCents, shippingCents, totalCents, taxCents };
};
