import { Product } from '../domain/Product';
import { toProductView } from './ProductView';

const CONTEXT = { whatsappNumber: '', siteName: 'Pastelería Acme' };
const noSigning = (keys: readonly string[]): Promise<string[]> =>
  Promise.resolve([...keys]);

const buildProduct = (
  overrides: Partial<{
    seoTitle: string | null;
    seoDescription: string | null;
    noindex: boolean;
    updatedAt: Date | null;
  }> = {},
): Product =>
  new Product(
    'prod-1',
    'torta-chocolate',
    'Torta de chocolate',
    'Ocho porciones',
    [],
    2999000,
    null,
    'CLP',
    null,
    [],
    true,
    false,
    0,
    4,
    overrides.seoTitle ?? null,
    overrides.seoDescription ?? null,
    overrides.noindex ?? false,
    overrides.updatedAt ?? null,
  );

describe('campos de buscador en la vista pública de un producto', () => {
  it('sin configurar, el sitio usa el nombre y la descripción del producto', async () => {
    const view = await toProductView(buildProduct(), noSigning, CONTEXT);

    expect(view.seoTitle).toBeNull();
    expect(view.seoDescription).toBeNull();
    expect(view.noindex).toBe(false);
  });

  it('entrega el título y la descripción propios cuando existen', async () => {
    const product = buildProduct({
      seoTitle: 'Torta de chocolate a pedido en Santiago',
      seoDescription: 'Ocho porciones, entrega en el día.',
    });

    const view = await toProductView(product, noSigning, CONTEXT);

    expect(view.seoTitle).toBe('Torta de chocolate a pedido en Santiago');
    expect(view.seoDescription).toBe('Ocho porciones, entrega en el día.');
  });

  it('un producto fuera del índice lo declara: se compra por el enlace, no se lista', async () => {
    const view = await toProductView(buildProduct({ noindex: true }), noSigning, CONTEXT);

    expect(view.noindex).toBe(true);
  });

  it('expone la fecha de modificación para el `lastmod` del sitemap', async () => {
    const product = buildProduct({ updatedAt: new Date('2026-02-01T10:00:00.000Z') });

    const view = await toProductView(product, noSigning, CONTEXT);

    expect(view.updatedAt).toBe('2026-02-01T10:00:00.000Z');
  });

  it('un producto que nunca se tocó no inventa una fecha', async () => {
    const view = await toProductView(buildProduct(), noSigning, CONTEXT);

    expect(view.updatedAt).toBeNull();
  });
});
