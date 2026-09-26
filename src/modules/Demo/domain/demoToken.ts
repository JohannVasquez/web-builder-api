import { createHash, randomBytes } from 'node:crypto';

// Prefijo propio para no confundirlo con un enlace de revisión (`prev_`) ni con una clave de
// agente: quien lo ve en un log sabe de inmediato qué es y dónde anularlo.
const TOKEN_PREFIX = 'demo_';
// 32 bytes = 256 bits: imposible de adivinar, aunque el enlace viaje por WhatsApp.
const SECRET_BYTES = 32;
const TOKEN_PATTERN = /^demo_[0-9a-f]{64}$/;

export interface GeneratedDemoToken {
  readonly token: string;
  readonly hash: string;
}

export const hashDemoToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const generateDemoToken = (): GeneratedDemoToken => {
  const token = `${TOKEN_PREFIX}${randomBytes(SECRET_BYTES).toString('hex')}`;
  return { token, hash: hashDemoToken(token) };
};

// Descarta lo que no tiene la forma de un token antes de ir a la base.
export const looksLikeDemoToken = (token: string): boolean => TOKEN_PATTERN.test(token);

// La webapp canjea el token en `/demo/<token>` del propio subdominio de la demo. En desarrollo
// (`localhost` y sus subdominios) no hay certificado, así que va por http y sin puerto: el
// puerto lo pone quien arma el entorno local (o Caddy delante).
export const buildDemoUrl = (domain: string, token: string): string => {
  const isLocal = domain === 'localhost' || domain.endsWith('.localhost');
  return `${isLocal ? 'http' : 'https'}://${domain}/demo/${token}`;
};
