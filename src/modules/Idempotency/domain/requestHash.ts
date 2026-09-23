import { createHash } from 'node:crypto';

// Serialización estable: el mismo cuerpo con las claves en otro orden es la misma petición.
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonical((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
};

export const requestHash = (body: unknown): string =>
  createHash('sha256')
    .update(JSON.stringify(canonical(body ?? null)))
    .digest('hex');

// Lo que se acepta como clave: lo que genera un cliente razonable (un UUID, un ULID) y nada
// que pueda servir para meter basura en la base.
export const isValidIdempotencyKey = (key: string): boolean =>
  /^[A-Za-z0-9_-]{8,255}$/.test(key);
