import { BlogContentSchema } from './BlogPostContentSchema';

describe('BlogContentSchema', () => {
  it('acepta cada tipo de bloque', () => {
    const content = [
      { type: 'paragraph', text: 'Un párrafo' },
      { type: 'heading', level: 2, text: 'Un título' },
      { type: 'list', ordered: true, items: ['uno', 'dos'] },
      { type: 'quote', text: 'Una cita', cite: 'Alguien' },
      { type: 'image', key: 'foto.png', alt: 'Una foto' },
      { type: 'video', url: 'https://youtu.be/abc' },
      { type: 'divider' },
    ];

    expect(BlogContentSchema.safeParse(content).success).toBe(true);
  });

  it('rechaza un tipo de bloque desconocido', () => {
    expect(BlogContentSchema.safeParse([{ type: 'carrusel', items: [] }]).success).toBe(
      false,
    );
  });

  it('rechaza un bloque al que le falta lo esencial', () => {
    expect(BlogContentSchema.safeParse([{ type: 'paragraph' }]).success).toBe(false);
    expect(BlogContentSchema.safeParse([{ type: 'image', key: 'x.png' }]).success).toBe(
      false,
    );
  });

  it('un título solo admite los niveles que tienen sentido dentro de un artículo', () => {
    expect(
      BlogContentSchema.safeParse([{ type: 'heading', level: 2, text: 'A' }]).success,
    ).toBe(true);
    expect(
      BlogContentSchema.safeParse([{ type: 'heading', level: 1, text: 'A' }]).success,
    ).toBe(false);
  });

  it('un contenido vacío es válido: una publicación puede empezar en blanco', () => {
    expect(BlogContentSchema.safeParse([]).success).toBe(true);
  });
});
