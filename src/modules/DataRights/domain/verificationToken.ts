import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Token que viaja en el correo de verificación. Se guarda SU HASH, nunca el token: quien lea
 * la base no puede hacerse pasar por el titular y pedir sus datos.
 *
 * Es el mismo criterio que una contraseña, con una diferencia: aquí no hace falta un hash
 * lento, porque el token tiene 32 bytes aleatorios y no hay diccionario que lo adivine.
 */
const TOKEN_BYTES = 32;

export const generateVerificationToken = (): string =>
  randomBytes(TOKEN_BYTES).toString('hex');

export const hashVerificationToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const isVerificationToken = (value: string): boolean =>
  /^[0-9a-f]{64}$/.test(value);

/**
 * Comparación en tiempo constante. Sobre hashes el riesgo de filtrar información por el
 * tiempo es remoto, pero no cuesta nada y evita tener que razonarlo otra vez.
 */
export const tokenMatches = (token: string, storedHash: string): boolean => {
  if (!isVerificationToken(token) || storedHash.length !== 64) {
    return false;
  }
  return timingSafeEqual(
    Buffer.from(hashVerificationToken(token), 'hex'),
    Buffer.from(storedHash, 'hex'),
  );
};
