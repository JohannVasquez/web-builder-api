import { calculateTotals, shippingCostFor, taxFor, type PricedLine } from './cartPricing';
import type { ShippingOption } from './StoreSettings';

describe('cartPricing', () => {
  const line = (unitPriceCents: number, quantity: number): PricedLine => ({
    productId: 1,
    name: 'Producto',
    variant: {},
    unitPriceCents,
    quantity,
    totalCents: unitPriceCents * quantity,
  });

  const despacho: ShippingOption = {
    code: 'despacho',
    name: 'Despacho a domicilio',
    priceCents: 4990,
    estimate: '2 a 3 días hábiles',
    requiresAddress: true,
  };

  const base = {
    discountCents: 0,
    shipping: null,
    freeShippingThresholdCents: null,
    taxIncluded: true,
    taxRatePercent: 19,
  };

  it('suma las líneas del carrito', () => {
    const totals = calculateTotals({ ...base, lines: [line(10000, 2), line(5000, 1)] });

    expect(totals.subtotalCents).toBe(25000);
    expect(totals.totalCents).toBe(25000);
  });

  it('con IVA incluido despeja el impuesto en vez de sumarlo', () => {
    const totals = calculateTotals({ ...base, lines: [line(11900, 1)] });

    expect(totals.totalCents).toBe(11900);
    expect(totals.taxCents).toBe(1900);
  });

  it('con IVA por fuera lo agrega al total', () => {
    const totals = calculateTotals({
      ...base,
      lines: [line(10000, 1)],
      taxIncluded: false,
    });

    expect(totals.taxCents).toBe(1900);
    expect(totals.totalCents).toBe(11900);
  });

  it('nunca descuenta más que el subtotal', () => {
    const totals = calculateTotals({
      ...base,
      lines: [line(5000, 1)],
      discountCents: 20000,
    });

    expect(totals.discountCents).toBe(5000);
    expect(totals.totalCents).toBe(0);
  });

  it('suma el envío después del descuento', () => {
    const totals = calculateTotals({
      ...base,
      lines: [line(20000, 1)],
      discountCents: 5000,
      shipping: despacho,
    });

    expect(totals.totalCents).toBe(20000 - 5000 + 4990);
  });

  it('regala el envío cuando lo que se paga llega al umbral', () => {
    const totals = calculateTotals({
      ...base,
      lines: [line(50000, 1)],
      shipping: despacho,
      freeShippingThresholdCents: 50000,
    });

    expect(totals.shippingCents).toBe(0);
  });

  it('no regala el envío si el cupón bajó el pago debajo del umbral', () => {
    expect(shippingCostFor(despacho, 49000, 50000)).toBe(4990);
  });

  it('no calcula impuesto cuando la tasa es cero', () => {
    expect(taxFor(10000, true, 0)).toBe(0);
  });

  it('no cobra envío cuando la persona retira en tienda', () => {
    const totals = calculateTotals({ ...base, lines: [line(9990, 1)], shipping: null });

    expect(totals.shippingCents).toBe(0);
    expect(totals.totalCents).toBe(9990);
  });
});
