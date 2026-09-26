import { calculateReadingMinutes } from './calculateReadingMinutes';
import type { BlogContent } from '../domain/BlogPostContentSchema';

describe('calculateReadingMinutes', () => {
  const words = (count: number): string =>
    Array.from({ length: count }, () => 'palabra').join(' ');

  it('un contenido vacío igual cuenta como un minuto', () => {
    expect(calculateReadingMinutes([])).toBe(1);
  });

  it('un texto corto es un minuto, no cero', () => {
    expect(calculateReadingMinutes([{ type: 'paragraph', text: 'Hola mundo' }])).toBe(1);
  });

  it('cuenta a 200 palabras por minuto', () => {
    const content: BlogContent = [{ type: 'paragraph', text: words(600) }];
    expect(calculateReadingMinutes(content)).toBe(3);
  });

  it('suma el texto de todos los tipos de bloque', () => {
    const content: BlogContent = [
      { type: 'heading', level: 2, text: words(100) },
      { type: 'list', ordered: false, items: [words(100)] },
      { type: 'quote', text: words(100) },
      { type: 'divider' },
    ];
    expect(calculateReadingMinutes(content)).toBe(2);
  });

  it('un separador no aporta palabras', () => {
    expect(calculateReadingMinutes([{ type: 'divider' }])).toBe(1);
  });
});
