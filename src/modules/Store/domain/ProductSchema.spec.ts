import { ProductInputSchema, ProductUpdateSchema } from './ProductSchema';

describe('ProductSchema', () => {
  const valid = {
    slug: 'torta-de-chocolate',
    name: 'Torta de chocolate',
    priceCents: 29990,
  };

  it('acepta lo mínimo y deja valores razonables por defecto', () => {
    const parsed = ProductInputSchema.parse(valid);
    expect(parsed.currency).toBe('CLP');
    expect(parsed.isActive).toBe(true);
    expect(parsed.featured).toBe(false);
    expect(parsed.variants).toEqual([]);
  });

  it('rechaza un precio negativo', () => {
    expect(ProductInputSchema.safeParse({ ...valid, priceCents: -1 }).success).toBe(
      false,
    );
  });

  it('rechaza una oferta que no es más barata que el precio normal', () => {
    expect(
      ProductInputSchema.safeParse({ ...valid, salePriceCents: 29990 }).success,
    ).toBe(false);
    expect(
      ProductInputSchema.safeParse({ ...valid, salePriceCents: 39990 }).success,
    ).toBe(false);
    expect(
      ProductInputSchema.safeParse({ ...valid, salePriceCents: 19990 }).success,
    ).toBe(true);
  });

  it('rechaza una dirección con mayúsculas o espacios', () => {
    expect(
      ProductInputSchema.safeParse({ ...valid, slug: 'Torta Chocolate' }).success,
    ).toBe(false);
  });

  it('acepta variantes con sus opciones y rechaza una sin ninguna', () => {
    expect(
      ProductInputSchema.safeParse({
        ...valid,
        variants: [{ name: 'Tamaño', options: ['20 porciones'] }],
      }).success,
    ).toBe(true);
    expect(
      ProductInputSchema.safeParse({
        ...valid,
        variants: [{ name: 'Tamaño', options: [] }],
      }).success,
    ).toBe(false);
  });

  it('un PATCH parcial no rellena lo que no se envió', () => {
    expect(ProductUpdateSchema.parse({ featured: true })).toEqual({ featured: true });
    expect(ProductUpdateSchema.parse({})).toEqual({});
  });

  it('rechaza una clave desconocida, para que un typo no pase en silencio', () => {
    expect(ProductInputSchema.safeParse({ ...valid, precio: 100 }).success).toBe(false);
  });
});
