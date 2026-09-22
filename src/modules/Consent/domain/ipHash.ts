import { createHash } from 'node:crypto';

/**
 * Huella de la IP en vez de la IP. Acredita que dos consentimientos vienen del mismo origen,
 * que es para lo único que hace falta, sin conservar un dato personal que la ley obliga a
 * minimizar.
 *
 * La sal es lo que impide reconstruir la IP probando las cuatro mil millones posibles: sin
 * ella, un sha256 de una IP es reversible en segundos.
 */
export const hashIp = (ip: string | undefined, salt: string): string | null => {
  if (ip === undefined || ip.trim() === '' || salt === '') {
    return null;
  }
  return createHash('sha256').update(`${salt}:${ip.trim()}`).digest('hex');
};
