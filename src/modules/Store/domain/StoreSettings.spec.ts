import { mergePaymentCredentials, StoreSettings } from './StoreSettings';

describe('mergePaymentCredentials', () => {
  const current = {
    accountName: 'Pastelería Luna SpA',
    bank: 'Banco de Chile',
    accountNumber: '00123456789',
  };

  it('cambiar un dato no borra los demás', () => {
    expect(mergePaymentCredentials(current, { rut: '77.123.456-7' })).toEqual({
      ...current,
      rut: '77.123.456-7',
    });
  });

  it('reemplaza el dato que sí se escribió', () => {
    expect(mergePaymentCredentials(current, { bank: 'Banco Estado' }).bank).toBe(
      'Banco Estado',
    );
  });

  it('trata un campo vacío como no tocado, no como una orden de borrarlo', () => {
    expect(mergePaymentCredentials(current, { bank: '   ' }).bank).toBe('Banco de Chile');
  });

  it('funciona cuando todavía no había credenciales', () => {
    expect(mergePaymentCredentials({}, { apiKey: 'llave' })).toEqual({ apiKey: 'llave' });
  });
});

describe('StoreSettings.toPrimitives', () => {
  it('nunca expone las credenciales, solo dice si están', () => {
    const settings = new StoreSettings(
      1,
      true,
      'CLP',
      true,
      19,
      [],
      null,
      'transfer',
      { accountNumber: '00123456789' },
      null,
    );

    const primitives = settings.toPrimitives();

    expect(primitives.hasPaymentCredentials).toBe(true);
    expect(JSON.stringify(primitives)).not.toContain('00123456789');
  });
});
