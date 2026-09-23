import { z } from 'zod';
import { idSchema } from '@/shared/domain/identifier';

const typeSchema = z.string().min(1).max(100);
const positionSchema = z.number().int().min(0);
const propsSchema = z.record(z.string(), z.unknown());
const anchorSchema = z.string().max(100).nullable().optional();

/**
 * Validación genérica de una sección: el `props` es JSON libre (cada tipo
 * de sección valida su propio schema en el frontend al renderizar — AC1.5,
 * tolerancia a fallos visuales). El panel de admin no duplica esos 12+
 * schemas por tipo; solo garantiza que `props` sea un objeto serializable.
 */
export const PageSectionInputSchema = z.strictObject({
  type: typeSchema,
  position: positionSchema,
  props: propsSchema.default({}),
  anchor: anchorSchema,
  isHidden: z.boolean().default(false),
});

export type PageSectionInput = z.infer<typeof PageSectionInputSchema>;

/**
 * No es `PageSectionInputSchema.partial()`: `.partial()` no borra el
 * `.default({})` de `props`, así que un PATCH sin ese campo lo resetearía
 * igual a `{}` — justo lo contrario de "no tocar este campo" que espera un
 * update parcial (mismo problema que `PageUpdateSchema`).
 */
export const PageSectionUpdateSchema = z.strictObject({
  type: typeSchema.optional(),
  position: positionSchema.optional(),
  props: propsSchema.optional(),
  anchor: anchorSchema,
  isHidden: z.boolean().optional(),
});

export type PageSectionUpdateInput = z.infer<typeof PageSectionUpdateSchema>;

export const ReorderSectionsSchema = z.strictObject({
  sectionIds: z.array(idSchema).min(1),
});
