import { z } from 'zod';

const slug = z
  .string()
  .min(1)
  .max(255)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Usa minúsculas y guiones, por ejemplo "torta-de-chocolate"',
  );

const priceCents = z.number().int().min(0, 'El precio no puede ser negativo');

const variants = z
  .array(
    z.strictObject({
      name: z.string().min(1),
      options: z.array(z.string().min(1)).min(1),
    }),
  )
  .default([]);

const base = {
  slug,
  name: z.string().min(1).max(255),
  description: z.string().max(5000).default(''),
  imageKeys: z.array(z.string().max(500)).default([]),
  priceCents,
  salePriceCents: priceCents.nullable().default(null),
  currency: z.string().length(3).default('CLP'),
  categoryId: z.number().int().positive().nullable().default(null),
  variants,
  isActive: z.boolean().default(true),
  featured: z.boolean().default(false),
  position: z.number().int().min(0).default(0),
  // `null` = sin control de stock; 0 = agotado.
  stock: z.number().int().min(0).nullable().default(null),
};

// Una oferta que no es más barata que el precio normal no es una oferta: o es un error de
// carga, o engaña a quien compra. Las dos cosas se atajan aquí.
const cheaperSalePrice = (value: {
  priceCents: number;
  salePriceCents: number | null;
}): boolean => value.salePriceCents === null || value.salePriceCents < value.priceCents;

const SALE_PRICE_MESSAGE =
  'El precio de oferta tiene que ser menor que el precio normal.';

export const ProductInputSchema = z
  .strictObject(base)
  .refine(cheaperSalePrice, SALE_PRICE_MESSAGE);

export type ProductInput = z.infer<typeof ProductInputSchema>;

// Sin `.default()` en ningún campo: `.optional()` sobre un `.default()` igual rellena el
// valor y un PATCH parcial terminaría pisando lo guardado. Mismo footgun que `PageSchema`.
export const ProductUpdateSchema = z
  .strictObject({
    slug: slug.optional(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional(),
    imageKeys: z.array(z.string().max(500)).optional(),
    priceCents: priceCents.optional(),
    salePriceCents: priceCents.nullable().optional(),
    currency: z.string().length(3).optional(),
    categoryId: z.number().int().positive().nullable().optional(),
    variants: z
      .array(
        z.strictObject({
          name: z.string().min(1),
          options: z.array(z.string().min(1)).min(1),
        }),
      )
      .optional(),
    isActive: z.boolean().optional(),
    featured: z.boolean().optional(),
    position: z.number().int().min(0).optional(),
    stock: z.number().int().min(0).nullable().optional(),
  })
  .refine(
    (value) =>
      value.salePriceCents === undefined ||
      value.priceCents === undefined ||
      value.salePriceCents === null ||
      value.salePriceCents < value.priceCents,
    SALE_PRICE_MESSAGE,
  );

export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;

export const CategoryInputSchema = z.strictObject({
  slug,
  name: z.string().min(1).max(255),
  position: z.number().int().min(0).default(0),
});

export const CategoryUpdateSchema = z.strictObject({
  slug: slug.optional(),
  name: z.string().min(1).max(255).optional(),
  position: z.number().int().min(0).optional(),
});

export type CategoryInput = z.infer<typeof CategoryInputSchema>;
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateSchema>;
