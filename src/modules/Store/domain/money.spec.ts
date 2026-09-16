import { effectivePriceCents, formatMoney, hasDiscount } from './money';

describe('money', () => {
  it('formatea pesos chilenos sin decimales', () => {
    expect(formatMoney(19990).replace(/ /g, ' ')).toContain('19.990');
    expect(formatMoney(19990)).not.toContain(',00');
  });

  it('el precio vigente es el de oferta cuando existe', () => {
    expect(effectivePriceCents(19990, 14990)).toBe(14990);
    expect(effectivePriceCents(19990, null)).toBe(19990);
  });

  it('una oferta que no es más barata no cuenta como oferta', () => {
    expect(hasDiscount(19990, 14990)).toBe(true);
    expect(hasDiscount(19990, 19990)).toBe(false);
    expect(hasDiscount(19990, null)).toBe(false);
  });

  it('un precio cero se formatea, no se rompe', () => {
    expect(formatMoney(0)).toContain('0');
  });
});
