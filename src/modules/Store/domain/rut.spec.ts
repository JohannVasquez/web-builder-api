import { formatRut, isValidRut, normalizeRut } from './rut';

describe('normalizeRut', () => {
  it.each([
    ['12.345.678-5', '12345678-5'],
    ['12345678-5', '12345678-5'],
    ['123456785', '12345678-5'],
    ['12.345.678-k', '12345678-K'],
    ['  12.345.678 - 5 ', '12345678-5'],
  ])('%s se guarda como %s', (input, expected) => {
    expect(normalizeRut(input)).toBe(expected);
  });
});

describe('isValidRut', () => {
  // El dígito verificador es lo único que distingue un RUT real de ocho dígitos cualquiera.
  it.each(['11.111.111-1', '12.345.678-5', '76.086.428-5', '20.347.816-K'])(
    '%s es válido',
    (rut) => {
      expect(isValidRut(rut)).toBe(true);
    },
  );

  it.each([
    ['12.345.678-9', 'dígito verificador equivocado'],
    ['11.111.111-2', 'dígito verificador equivocado'],
    ['123-5', 'cuerpo demasiado corto'],
    ['123456789012-5', 'cuerpo demasiado largo'],
    ['', 'vacío'],
    ['no-es-un-rut', 'letras'],
    ['12.345.678-X', 'verificador que no existe'],
  ])('%s se rechaza (%s)', (rut) => {
    expect(isValidRut(rut)).toBe(false);
  });
});

describe('formatRut', () => {
  it('lo escribe como se lee en una boleta', () => {
    expect(formatRut('123456785')).toBe('12.345.678-5');
    expect(formatRut('20347816K')).toBe('20.347.816-K');
  });

  it('lo que no es un RUT se devuelve tal cual, sin inventar puntos', () => {
    expect(formatRut('no-es-un-rut')).toBe('no-es-un-rut');
  });
});
