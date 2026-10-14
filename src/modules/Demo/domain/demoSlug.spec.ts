import { definitiveSlugFor, slugSuggestions } from './demoSlug';

describe('slugs de demo', () => {
  it('el cliente se llama como la demo, sin demo-', () => {
    expect(definitiveSlugFor('demo-pasteleria-luna')).toBe('pasteleria-luna');
  });

  it('una segunda o tercera propuesta vuelve al nombre del negocio', () => {
    expect(definitiveSlugFor('demo-pasteleria-luna-2')).toBe('pasteleria-luna');
    expect(definitiveSlugFor('demo-pasteleria-luna-3')).toBe('pasteleria-luna');
  });

  it('solo quita los sufijos que pudo poner la sugerencia', () => {
    // `-1` nunca se sugiere y `-51` está fuera del rango: son parte del nombre.
    expect(definitiveSlugFor('demo-hotel-1')).toBe('hotel-1');
    expect(definitiveSlugFor('demo-local-51')).toBe('local-51');
    expect(definitiveSlugFor('demo-2024')).toBe('2024');
    // Sin dejar un slug de menos de dos caracteres.
    expect(definitiveSlugFor('demo-a-2')).toBe('a-2');
  });

  it('un tenant sin prefijo se deja como está', () => {
    expect(definitiveSlugFor('pasteleria-luna')).toBe('pasteleria-luna');
  });

  it('las sugerencias van de -2 a -50 y respetan el largo máximo', () => {
    const suggestions = slugSuggestions('pasteleria-luna', 100);
    expect(suggestions[0]).toBe('pasteleria-luna-2');
    expect(suggestions.at(-1)).toBe('pasteleria-luna-50');
    expect(suggestions).toHaveLength(49);

    const long = slugSuggestions('a'.repeat(9) + '-' + 'b'.repeat(10), 20);
    expect(long[0]).toBe('aaaaaaaaa-bbbbbbbb-2');
    expect(long.every((slug) => slug.length <= 20)).toBe(true);
    // Sin dejar un guion colgando antes del sufijo.
    expect(slugSuggestions('abc-defg', 6)[0]).toBe('abc-2');
  });
});
