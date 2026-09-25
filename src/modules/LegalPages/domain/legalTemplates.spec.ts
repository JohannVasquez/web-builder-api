import {
  LEGAL_PAGE_TEMPLATES,
  fillPlaceholders,
  findLegalTemplate,
} from './legalTemplates';

describe('plantillas legales', () => {
  it('trae privacidad, cookies, términos de uso y términos de compra', () => {
    expect(LEGAL_PAGE_TEMPLATES.map((template) => template.kind).sort()).toEqual([
      'compra',
      'cookies',
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
    expect(findLegalTemplate('lo-que-sea')).toBeUndefined();
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
    const known = new Set(['siteName', 'address', 'contactEmail', 'contactPhone', 'legalName', 'taxId']);
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

describe('política de privacidad', () => {
  const privacy = LEGAL_PAGE_TEMPLATES.find((template) => template.kind === 'privacidad');

  it('se apoya en la Ley 21.719, no en la 19.628, que quedó derogada', () => {
    expect(privacy?.body).toContain('21.719');
    expect(privacy?.body).not.toContain('19.628');
  });

  it('enumera los cinco derechos del titular, no solo tres', () => {
    for (const derecho of [
      'acceder',
      'rectificarlos',
      'suprimirlos',
      'oponerte',
      'portabilidad',
    ]) {
      expect(privacy?.body).toContain(derecho);
    }
  });

  it('nombra a la Agencia, que es ante quien se reclama', () => {
    expect(privacy?.body).toContain('Agencia de Protección de Datos Personales');
  });

  it('declara la base de licitud de cada tratamiento', () => {
    expect(privacy?.body).toContain('consentimiento');
    expect(privacy?.body).toContain('obligación legal');
  });

  it('advierte de las transferencias fuera de Chile', () => {
    expect(privacy?.body).toContain('fuera de Chile');
  });

  it('dice qué pasa con los datos de menores y con una brecha', () => {
    expect(privacy?.body).toContain('menores');
    expect(privacy?.body).toContain('brecha');
  });

  it('declara plazos de conservación concretos, no "el tiempo necesario"', () => {
    expect(privacy?.body).toContain('Cuánto tiempo los guardamos');
    expect(privacy?.body).toContain('anónimos');
  });
});

describe('política de cookies', () => {
  const cookies = LEGAL_PAGE_TEMPLATES.find((template) => template.kind === 'cookies');

  it('tiene la dirección que enlaza el aviso del sitio', () => {
    // La webapp enlaza `/politica-de-cookies` (ver COOKIE_POLICY_SLUG).
    expect(cookies?.slug).toBe('politica-de-cookies');
  });

  it('separa las tres finalidades', () => {
    expect(cookies?.body).toContain('Necesarias');
    expect(cookies?.body).toContain('Medición');
    expect(cookies?.body).toContain('Publicidad');
  });

  it('lista cada cookie con quién la pone y cuánto dura', () => {
    expect(cookies?.body).toContain('_ga');
    expect(cookies?.body).toContain('_fbp');
    expect(cookies?.body).toContain('Cuánto dura');
  });

  it('explica cómo cambiar la decisión, que la ley exige que sea posible', () => {
    expect(cookies?.body).toContain('Configurar cookies');
  });
});
