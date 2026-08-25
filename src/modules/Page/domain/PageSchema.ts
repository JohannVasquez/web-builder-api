import { z } from 'zod';

const slugSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');
const titleSchema = z.string().min(1).max(255);
const descriptionSchema = z.string().max(2000).nullable().optional();

export const PageInputSchema = z.strictObject({
  slug: slugSchema,
  title: titleSchema,
  description: descriptionSchema,
  isPublished: z.boolean().default(true),
});

export type PageInput = z.infer<typeof PageInputSchema>;

/**
 * No es `PageInputSchema.partial()`: `.partial()` no borra el `.default()`
 * de `isPublished`, así que un PATCH sin ese campo lo forzaría igual a
 * `true` — justo lo contrario de "no tocar este campo" que espera un update
 * parcial. Cada campo se declara `optional()` a mano, sin default.
 */
export const PageUpdateSchema = z.strictObject({
  slug: slugSchema.optional(),
  title: titleSchema.optional(),
  description: descriptionSchema,
  isPublished: z.boolean().optional(),
});

export type PageUpdateInput = z.infer<typeof PageUpdateSchema>;
