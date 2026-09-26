import { z } from 'zod';
import { BadRequestError } from './BadRequestError';

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/i;

export const isUuid = (value: string): boolean => {
  return UUID_REGEX.test(value);
};

export const parseId = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !isUuid(value)) {
    throw new BadRequestError(`El identificador "${label}" no es válido.`);
  }
  return value;
};

// Esquema único para todo identificador que entra por la API o el MCP: un solo lugar decide el
// formato y el mensaje, que lee una persona o un agente.
export const idSchema = z.uuid({ error: 'El identificador no es válido.' });
