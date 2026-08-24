export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * La extensión de la key se deriva del MIME type validado, nunca del nombre
 * de archivo enviado por el cliente (AC1.4).
 */
export const MIME_EXTENSIONS: Record<AllowedMimeType, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
};

export const isAllowedMimeType = (mimeType: string): mimeType is AllowedMimeType =>
  (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
