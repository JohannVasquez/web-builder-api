import { CreateTenantSchema } from './TenantSchema';

describe('CreateTenantSchema', () => {
  const valid = { slug: 'pasteleria-luna', name: 'Pastelería Luna' };

  it('acepta lo mínimo y deja la lista de dominios vacía', () => {
    expect(CreateTenantSchema.parse(valid).domains).toEqual([]);
  });

  it('rechaza un identificador con mayúsculas o espacios', () => {
    expect(() =>
      CreateTenantSchema.parse({ ...valid, slug: 'Pasteleria Luna' }),
    ).toThrow();
    expect(() => CreateTenantSchema.parse({ ...valid, slug: 'Pasteleria' })).toThrow();
  });

  it('rechaza un dominio con protocolo o puerto', () => {
    expect(() =>
      CreateTenantSchema.parse({ ...valid, domains: ['https://pasteleria.cl'] }),
    ).toThrow();
    expect(() =>
      CreateTenantSchema.parse({ ...valid, domains: ['pasteleria.cl:3000'] }),
    ).toThrow();
  });

  it('acepta varios dominios; el primero es el canónico', () => {
    const parsed = CreateTenantSchema.parse({
      ...valid,
      domains: ['pasteleria.cl', 'pasteleria.webbuilder.co'],
    });
    expect(parsed.domains[0]).toBe('pasteleria.cl');
  });

  it('rechaza una clave desconocida, para que un typo no pase en silencio', () => {
    expect(() =>
      CreateTenantSchema.parse({ ...valid, plantilla: 'pasteleria' }),
    ).toThrow();
  });
});
