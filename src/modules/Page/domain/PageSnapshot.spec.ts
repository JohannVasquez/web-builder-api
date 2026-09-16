import { Page, PageSection } from './Page';
import { pageFromSnapshot, snapshotOf } from './PageSnapshot';

describe('PageSnapshot', () => {
  const page = new Page(
    'home',
    'Inicio',
    'Descripción',
    [
      new PageSection('Features', 2, { title: 'Dos' }, null, 20),
      new PageSection('Hero', 1, { title: 'Uno' }, 'portada', 10),
    ],
    5,
    true,
  );

  it('guarda las secciones ordenadas, no en el orden en que vinieron', () => {
    expect(snapshotOf(page).sections.map((section) => section.type)).toEqual([
      'Hero',
      'Features',
    ]);
  });

  it('no guarda los ids de sección: al restaurar se crean filas nuevas', () => {
    const snapshot = snapshotOf(page);
    expect(JSON.stringify(snapshot)).not.toContain('"id"');
  });

  it('va y vuelve sin perder contenido', () => {
    const restored = pageFromSnapshot('home', snapshotOf(page));

    expect(restored?.title).toBe('Inicio');
    expect(restored?.sections).toHaveLength(2);
    expect(restored?.sections[0]?.anchor).toBe('portada');
    expect(restored?.sections[0]?.props).toEqual({ title: 'Uno' });
  });

  it('una foto inválida devuelve null en vez de una página a medias', () => {
    expect(pageFromSnapshot('home', { title: 'Sin secciones' })).toBeNull();
    expect(pageFromSnapshot('home', null)).toBeNull();
    expect(pageFromSnapshot('home', 'basura')).toBeNull();
  });
});
