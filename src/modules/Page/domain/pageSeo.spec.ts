import { EMPTY_PAGE_SEO, Page, PageSection } from './Page';
import { PageInputSchema, PageUpdateSchema } from './PageSchema';
import { pageFromSnapshot, snapshotOf } from './PageSnapshot';

const buildPage = (): Page =>
  new Page(
    'servicios',
    'Servicios',
    'Lo que hacemos',
    [new PageSection('Hero', 1, { title: 'Hola' }, null, 'section-1')],
    'page-1',
    true,
    null,
    null,
    {
      seoTitle: 'Servicios de pastelería en Santiago',
      seoDescription: 'Tortas a pedido, entrega en el día.',
      ogImage: 'tenants/acme/og.jpg',
      noindex: false,
    },
  );

describe('campos de buscador de una página', () => {
  it('sin configurar, la página no impone nada: el sitio usa su título y su descripción', () => {
    const page = new Page('home', 'Inicio', null, []);

    expect(page.seo).toEqual(EMPTY_PAGE_SEO);
    expect(page.toPrimitives()).toMatchObject({
      seoTitle: null,
      seoDescription: null,
      ogImageUrl: null,
      noindex: false,
    });
  });

  it('el camino público entrega la imagen ya firmada; el de admin, la clave del bucket', () => {
    const page = buildPage();

    expect(page.toPrimitives().ogImageUrl).toBe('tenants/acme/og.jpg');
    expect(page.toAdminPrimitives().ogImageKey).toBe('tenants/acme/og.jpg');
  });

  it('`withSeo` reemplaza solo los campos de buscador', () => {
    const page = buildPage().withSeo({ ...EMPTY_PAGE_SEO, noindex: true });

    expect(page.title).toBe('Servicios');
    expect(page.sections).toHaveLength(1);
    expect(page.seo.noindex).toBe(true);
    expect(page.seo.seoTitle).toBeNull();
  });

  it('NO viajan en la foto publicada: son ajustes de la página, no contenido', () => {
    // Si viajaran, el sitemap (que lee la fila) y la propia página (que lee la foto) podrían
    // contradecirse hasta la siguiente publicación.
    const snapshot = snapshotOf(buildPage());

    expect(snapshot).not.toHaveProperty('noindex');
    expect(snapshot).not.toHaveProperty('seoTitle');
    expect(pageFromSnapshot('servicios', snapshot)?.seo).toEqual(EMPTY_PAGE_SEO);
  });
});

describe('validación de entrada', () => {
  it('acepta una página sin ningún campo de buscador', () => {
    const parsed = PageInputSchema.parse({ slug: 'home', title: 'Inicio' });

    expect(parsed.noindex).toBe(false);
  });

  it('rechaza un título de buscador más largo de lo que cabe en un resultado', () => {
    const result = PageInputSchema.safeParse({
      slug: 'home',
      title: 'Inicio',
      seoTitle: 'x'.repeat(256),
    });

    expect(result.success).toBe(false);
  });

  it('un PATCH sin `noindex` no lo toca, en vez de forzarlo a falso', () => {
    const parsed = PageUpdateSchema.parse({ title: 'Otro título' });

    expect(parsed.noindex).toBeUndefined();
  });

  it('un PATCH puede borrar el título de buscador mandando null', () => {
    expect(PageUpdateSchema.parse({ seoTitle: null }).seoTitle).toBeNull();
  });
});
