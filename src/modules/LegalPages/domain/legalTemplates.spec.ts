import {
  LEGAL_PAGE_TEMPLATES,
  fillPlaceholders,
  findLegalTemplate,
} from './legalTemplates';

describe('plantillas legales', () => {
  it('trae política de privacidad, términos de uso y términos de compra', () => {
    expect(LEGAL_PAGE_TEMPLATES.map((template) => template.kind).sort()).toEqual([
      'compra',
      'privacidad',
      'terminos',
    ]);
  });

  it('los términos de compra cubren lo que exige la Ley del Consumidor', () => {
    const purchase = LEGAL_PAGE_TEMPLATES.find((template) => template.kind === 'compra');

    expect(purchase?.slug).toBe('terminos-de-compra');
    for (const topic of [
      'Derecho a retracto',
      'Garantía legal',
      'Despacho',
      'IVA',
      '19.496',
    ]) {
      expect(purchase?.body).toContain(topic);
    }
  });

  it('devuelve undefined para un tipo desconocido', () => {
    expect(findLegalTemplate('cookies')).toBeUndefined();
  });

  it('rellena los datos del negocio', () => {
    const filled = fillPlaceholders('Escríbenos a {{contactEmail}} — {{siteName}}', {
      contactEmail: 'hola@acme.cl',
      siteName: 'Acme',
    });

    expect(filled).toBe('Escríbenos a hola@acme.cl — Acme');
  });

  it('deja el marcador visible si el dato falta, para que se note qué hay que completar', () => {
    expect(fillPlaceholders('Domicilio: {{address}}', { address: '' })).toBe(
      'Domicilio: {{address}}',
    );
    expect(fillPlaceholders('Domicilio: {{address}}', {})).toBe('Domicilio: {{address}}');
  });

  it('cada plantilla usa solo marcadores que el caso de uso sabe rellenar', () => {
    const known = new Set(['siteName', 'address', 'contactEmail', 'contactPhone']);
    for (const template of LEGAL_PAGE_TEMPLATES) {
      for (const match of template.body.matchAll(/\{\{(\w+)\}\}/g)) {
        expect(known.has(match[1] ?? '')).toBe(true);
      }
    }
  });

  it('los slugs son kebab-case y no se repiten', () => {
    const slugs = LEGAL_PAGE_TEMPLATES.map((template) => template.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });
});
