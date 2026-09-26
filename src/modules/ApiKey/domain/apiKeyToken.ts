import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const TOKEN_PREFIX = 'wb';
const PREFIX_BYTES = 6;
const SECRET_BYTES = 24;

export interface GeneratedApiKey {
  // Se muestra UNA sola vez, al crearla. Después solo queda el prefijo.
  readonly token: string;
  readonly prefix: string;
  readonly hash: string;
}

export const hashApiKeyToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const generateApiKeyToken = (): GeneratedApiKey => {
  const prefix = randomBytes(PREFIX_BYTES).toString('hex');
  const secret = randomBytes(SECRET_BYTES).toString('base64url');
  const token = `${TOKEN_PREFIX}_${prefix}_${secret}`;
  return { token, prefix, hash: hashApiKeyToken(token) };
};

// Reconoce el formato antes de ir a la base: ahorra una consulta por cada Bearer de sesión.
export const looksLikeApiKeyToken = (token: string): boolean =>
  token.startsWith(`${TOKEN_PREFIX}_`);

export const hashesMatch = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
};
