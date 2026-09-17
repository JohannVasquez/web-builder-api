import { Page, PageSection } from './Page';
import { pageFromSnapshot, snapshotOf } from './PageSnapshot';

describe('bloques ocultos', () => {
  const pageWith = (hidden: boolean): Page =>
    new Page(
      'home',
      'Inicio',
      null,
      [
        new PageSection('Hero', 1, { title: 'Hola' }, null, 10),
        new PageSection('Faq', 2, { title: 'Preguntas' }, null, 11, hidden),
      ],
      5,
      true,
    );

  it('no salen al sitio publicado', () => {
    const types = pageWith(true)
      .toPrimitives()
      .sections.map((section) => section.type);

    expect(types).toEqual(['Hero']);
  });

  it('siguen visibles en el panel, marcados como ocultos', () => {
    const sections = pageWith(true).toAdminPrimitives().sections;

    expect(sections).toHaveLength(2);
    expect(sections[1]).toMatchObject({ type: 'Faq', isHidden: true });
  });

  it('un bloque visible se sirve como siempre', () => {
    expect(pageWith(false).toPrimitives().sections).toHaveLength(2);
  });

  it('la foto de la página conserva que estaban ocultos, para poder restaurarla igual', () => {
    const snapshot = snapshotOf(pageWith(true));
    const restored = pageFromSnapshot('home', snapshot);

    expect(snapshot.sections[1].isHidden).toBe(true);
    expect(restored?.toAdminPrimitives).toBeDefined();
    expect(restored?.toPrimitives().sections).toHaveLength(1);
  });

  it('una foto vieja sin el campo da la sección por visible', () => {
    const restored = pageFromSnapshot('home', {
      title: 'Inicio',
      description: null,
      sections: [{ type: 'Hero', position: 1, props: {}, anchor: null }],
    });

    expect(restored?.toPrimitives().sections).toHaveLength(1);
  });
});
