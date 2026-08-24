import { z } from 'zod';

export const FileUploadResponseSchema = z.strictObject({
  key: z.string().min(1),
  url: z.url(),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
});

export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;
