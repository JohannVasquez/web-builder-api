import { z } from 'zod';
import { PERMISSIONS } from './Actor';
import { idSchema } from '@/shared/domain/identifier';

const DEFAULT_EXPIRY_DAYS = 90;

export const CreateApiKeySchema = z
  .strictObject({
    name: z.string().min(1).max(255),
    permission: z.enum(PERMISSIONS).default('write'),
    // `null` explícito = todos los clientes; una lista = solo esos.
    tenantIds: z.array(idSchema).nullable().default(null),
    rateLimitPerMinute: z.number().int().min(1).max(10_000).default(120),
    expiresInDays: z
      .number()
      .int()
      .min(1)
      .max(3650)
      .nullable()
      .default(DEFAULT_EXPIRY_DAYS),
  })
  .refine(
    (value) => value.tenantIds === null || value.tenantIds.length > 0,
    'Una clave con alcance limitado tiene que incluir al menos un cliente.',
  );

export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;

export const expiryFromDays = (days: number | null, now = new Date()): Date | null =>
  days === null ? null : new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
