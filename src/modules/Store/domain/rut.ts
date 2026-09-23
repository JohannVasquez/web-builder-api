/**
 * RUT chileno. Se guarda siempre normalizado —sin puntos, con guion y con la K en
 * mayúscula— para que dos personas que escriben el mismo RUT de distinta forma no queden
 * como dos vendedores distintos.
 */

const NON_RUT_CHARACTERS = /[^0-9kK]/g;
// Entre 7 y 8 dígitos más el verificador: cubre desde los RUT antiguos hasta los actuales.
const NORMALIZED_PATTERN = /^\d{7,8}-[\dK]$/;

export const normalizeRut = (value: string): string => {
  const clean = value.replace(NON_RUT_CHARACTERS, '').toUpperCase();
  if (clean.length < 2) {
    return clean;
  }
  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  return `${body}-${verifier}`;
};

/**
 * Dígito verificador por módulo 11: se recorre el cuerpo de derecha a izquierda multiplicando
 * por la serie 2,3,4,5,6,7 que se repite. Es lo que distingue un RUT real de ocho dígitos
 * cualquiera, y por eso se valida aquí y no con una expresión regular.
 */
const expectedVerifier = (body: string): string => {
  let sum = 0;
  let factor = 2;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) {
    return '0';
  }
  if (remainder === 10) {
    return 'K';
  }
  return String(remainder);
};

export const isValidRut = (value: string): boolean => {
  const normalized = normalizeRut(value);
  if (!NORMALIZED_PATTERN.test(normalized)) {
    return false;
  }
  const [body, verifier] = normalized.split('-');
  return expectedVerifier(body) === verifier;
};

// Con puntos, que es como lo lee una persona en una boleta.
export const formatRut = (value: string): string => {
  const normalized = normalizeRut(value);
  if (!NORMALIZED_PATTERN.test(normalized)) {
    return value;
  }
  const [body, verifier] = normalized.split('-');
  const withDots = body.replaceAll(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${verifier}`;
};
