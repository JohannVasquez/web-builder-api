import { buildWhatsAppOrderUrl } from './whatsAppOrder';

describe('buildWhatsAppOrderUrl', () => {
  const base = {
    whatsappNumber: '+56 9 1234 5678',
    productName: 'Torta de chocolate',
    priceCents: 29990,
    salePriceCents: null,
    currency: 'CLP',
  };

  const mensaje = (url: string): string =>
    decodeURIComponent(url.split('?text=')[1] ?? '');

  it('normaliza el número: wa.me solo acepta dígitos', () => {
    const url = buildWhatsAppOrderUrl(base) ?? '';
    expect(url.startsWith('https://wa.me/56912345678?text=')).toBe(true);
  });

  it('sin número configurado devuelve null, para que el sitio decida qué mostrar', () => {
    expect(buildWhatsAppOrderUrl({ ...base, whatsappNumber: '' })).toBeNull();
    expect(buildWhatsAppOrderUrl({ ...base, whatsappNumber: 'sin dígitos' })).toBeNull();
  });

  it('el mensaje llega escrito con el producto y el precio', () => {
    const texto = mensaje(buildWhatsAppOrderUrl(base) ?? '');
    expect(texto).toContain('Torta de chocolate');
    expect(texto).toContain('29.990');
  });

  it('usa el precio de oferta cuando lo hay', () => {
    const texto = mensaje(
      buildWhatsAppOrderUrl({ ...base, salePriceCents: 19990 }) ?? '',
    );
    expect(texto).toContain('19.990');
    expect(texto).not.toContain('29.990');
  });

  it('incluye las opciones elegidas', () => {
    const texto = mensaje(
      buildWhatsAppOrderUrl({
        ...base,
        selectedOptions: { Tamaño: '20 porciones', Relleno: 'Manjar' },
      }) ?? '',
    );
    expect(texto).toContain('Tamaño: 20 porciones');
    expect(texto).toContain('Relleno: Manjar');
  });

  it('omite las opciones que quedaron sin elegir', () => {
    const texto = mensaje(
      buildWhatsAppOrderUrl({ ...base, selectedOptions: { Tamaño: '' } }) ?? '',
    );
    expect(texto).not.toContain('Tamaño');
  });

  it('solo menciona la cantidad cuando es más de uno', () => {
    expect(mensaje(buildWhatsAppOrderUrl({ ...base, quantity: 1 }) ?? '')).not.toContain(
      'Cantidad',
    );
    expect(mensaje(buildWhatsAppOrderUrl({ ...base, quantity: 3 }) ?? '')).toContain(
      'Cantidad: 3',
    );
  });

  it('codifica acentos y saltos de línea, o el enlace llega roto', () => {
    const url = buildWhatsAppOrderUrl({ ...base, productName: 'Torta de limón' }) ?? '';
    expect(url).not.toContain('ó');
    expect(url).not.toContain('\n');
    expect(mensaje(url)).toContain('Torta de limón');
  });

  it('saluda con el nombre del negocio cuando se lo pasan', () => {
    expect(
      mensaje(buildWhatsAppOrderUrl({ ...base, siteName: 'Dulce Luna' }) ?? ''),
    ).toContain('Hola Dulce Luna');
  });
});
