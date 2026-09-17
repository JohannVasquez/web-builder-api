import { NavigationSchema } from './NavigationSchema';

describe('NavigationSchema', () => {
  const parse = (links: unknown): ReturnType<typeof NavigationSchema.safeParse> =>
    NavigationSchema.safeParse({ links });

  it('acepta páginas propias, anclas y sitios externos', () => {
    expect(
      parse([
        { label: 'Inicio', href: '/' },
        { label: 'Precios', href: '/servicios#precios' },
        { label: 'Instagram', href: 'https://instagram.com/cliente' },
      ]).success,
    ).toBe(true);
  });

  it('rechaza un enlace que no es ni ruta ni URL', () => {
    expect(parse([{ label: 'Roto', href: 'nosotros' }]).success).toBe(false);
  });

  it('rechaza un enlace sin texto', () => {
    expect(parse([{ label: '   ', href: '/' }]).success).toBe(false);
  });

  it('acepta un menú vacío: un sitio de una sola página puede no tener menú', () => {
    expect(parse([]).success).toBe(true);
  });
});
