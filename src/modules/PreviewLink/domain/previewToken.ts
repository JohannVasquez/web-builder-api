import { createHash, randomBytes } from 'node:crypto';

const TOKEN_PREFIX = 'prev';
const SECRET_BYTES = 32; // token suficientemente largo y seguro

export interface GeneratedPreviewToken {
  readonly token: string;
  readonly hash: string;
}

export const hashPreviewToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const generatePreviewToken = (): GeneratedPreviewToken => {
  const secret = randomBytes(SECRET_BYTES).toString('base64url');
  const token = `${TOKEN_PREFIX}_${secret}`;
  return { token, hash: hashPreviewToken(token) };
};

export const looksLikePreviewToken = (token: string): boolean =>
  token.startsWith(`${TOKEN_PREFIX}_`);
