import { Page, PageSection } from './Page';
import { pageFromSnapshot, snapshotOf } from './PageSnapshot';
import { PageInputSchema, PageUpdateSchema } from './PageSchema';

describe('estilo visual por página', () => {
  const page = (visualStyle: string | null): Page =>
    new Page(
      'home',
      'Inicio',
      null,
      [new PageSection('Hero', 1, { title: 'Hola' }, null, 10)],
      5,
      true,
      null,
      visualStyle,
    );

  it('sale al sitio publicado dentro de la foto', () => {
    const restored = pageFromSnapshot('home', snapshotOf(page('claymorphism')));

    expect(restored?.toPrimitives().visualStyle).toBe('claymorphism');
  });

  it('una foto vieja sin el campo hereda el estilo del sitio', () => {
    const restored = pageFromSnapshot('home', {
      title: 'Inicio',
      description: null,
      sections: [],
    });

    expect(restored?.toPrimitives().visualStyle).toBeNull();
  });

  it('el panel ve el estilo de la página', () => {
    expect(page('liquid-glass').toAdminPrimitives().visualStyle).toBe('liquid-glass');
  });

  it('acepta el mismo formato de id que el estilo del sitio y nulo para heredar', () => {
    expect(PageUpdateSchema.safeParse({ visualStyle: 'spatial-ui' }).success).toBe(true);
    expect(PageUpdateSchema.safeParse({ visualStyle: null }).success).toBe(true);
    expect(PageUpdateSchema.safeParse({ visualStyle: 'spatialUi' }).success).toBe(false);
    expect(
      PageInputSchema.safeParse({ slug: 'a', title: 'A', visualStyle: 'maximalism' })
        .success,
    ).toBe(true);
  });
});
