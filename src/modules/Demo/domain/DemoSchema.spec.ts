import { CreateDemoSchema } from './DemoSchema';
import { ProspectPatchSchema } from './Prospect';

describe('CreateDemoSchema', () => {
  const valid = {
    slug: 'pasteleria-luna',
    name: 'Pastelería Luna',
    templateId: 'pasteleria',
    prospect: { businessName: 'Pastelería Luna', email: '', phone: ' +56 9 1234 5678 ' },
  };

  it('acepta un prospecto nuevo y deja vacíos como nulos', () => {
    const parsed = CreateDemoSchema.parse(valid);

    expect(parsed.prospect?.email).toBeNull();
    expect(parsed.prospect?.phone).toBe('+56 9 1234 5678');
  });

  it('exige el prospecto o su id, no los dos ni ninguno', () => {
    expect(() =>
      CreateDemoSchema.parse({
        ...valid,
        prospectId: '018f6f1a-0000-7000-8000-000000000001',
      }),
    ).toThrow();
    expect(() => CreateDemoSchema.parse({ slug: 'luna', name: 'Luna' })).toThrow();
  });

  it('no deja pedir kit y duplicado a la vez', () => {
    expect(() =>
      CreateDemoSchema.parse({
        ...valid,
        duplicateFromTenantId: '018f6f1a-0000-7000-8000-000000000001',
      }),
    ).toThrow();
  });

  it('rechaza un correo del prospecto inválido', () => {
    expect(() =>
      CreateDemoSchema.parse({
        ...valid,
        prospect: { businessName: 'Luna', email: 'x' },
      }),
    ).toThrow();
  });
});

describe('ProspectPatchSchema', () => {
  it('exige al menos un campo', () => {
    expect(() => ProspectPatchSchema.parse({})).toThrow();
    expect(ProspectPatchSchema.parse({ notes: 'Llamar el lunes' })).toEqual({
      notes: 'Llamar el lunes',
    });
  });
});
