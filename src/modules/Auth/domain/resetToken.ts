import { createHash, randomBytes } from 'node:crypto';

export const generateResetToken = (): string => randomBytes(32).toString('hex');

// Solo el hash se guarda: quien lea la tabla no puede fabricar un enlace válido.
export const hashResetToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
