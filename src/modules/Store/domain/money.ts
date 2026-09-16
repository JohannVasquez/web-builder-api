// El dinero viaja en enteros de la unidad mínima. En pesos chilenos eso es el peso entero:
// el país no usa decimales, y guardar 19990.00 en punto flotante es un error que aparece
// tarde y en la factura.
export const formatMoney = (cents: number, currency = 'CLP'): string =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents);

// El precio que el visitante paga hoy: el de oferta si existe, el normal si no.
export const effectivePriceCents = (
  priceCents: number,
  salePriceCents: number | null,
): number => (salePriceCents === null ? priceCents : salePriceCents);

export const hasDiscount = (priceCents: number, salePriceCents: number | null): boolean =>
  salePriceCents !== null && salePriceCents < priceCents;
