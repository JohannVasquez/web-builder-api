import { z } from 'zod';
import { DEFAULT_FONT_PAIRING_ID, FONT_PAIRING_IDS } from './fontPairings';

// Solo hex: un formato único permite derivar tonos y contraste sin parsear CSS.
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const hexColor = z
  .string()
  .regex(HEX_COLOR, 'Usa un color en formato hexadecimal, por ejemplo #1d4ed8');

// Todo opcional (SPEC 1.1): con solo `primary` el sitio se ve coherente, el resto se deriva.
export const BrandPaletteSchema = z.strictObject({
  primary: hexColor.optional(),
  secondary: hexColor.optional(),
  accent: hexColor.optional(),
  background: hexColor.optional(),
  foreground: hexColor.optional(),
  success: hexColor.optional(),
  warning: hexColor.optional(),
  danger: hexColor.optional(),
});

export type BrandPalette = z.infer<typeof BrandPaletteSchema>;

export const TEXT_SCALES = ['compact', 'normal', 'spacious'] as const;

export const BrandTypographySchema = z.strictObject({
  pairing: z
    .enum(FONT_PAIRING_IDS as [string, ...string[]])
    .default(DEFAULT_FONT_PAIRING_ID),
  scale: z.enum(TEXT_SCALES).default('normal'),
});

export type BrandTypography = z.infer<typeof BrandTypographySchema>;

// `keys` del bucket privado, nunca URLs: se firman al vuelo en cada lectura.
export const BrandAssetsSchema = z.strictObject({
  logoLight: z.string().max(500).optional(),
  logoDark: z.string().max(500).optional(),
  favicon: z.string().max(500).optional(),
  ogImage: z.string().max(500).optional(),
});

export type BrandAssets = z.infer<typeof BrandAssetsSchema>;

export const COLOR_MODES = ['light', 'dark', 'system'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

// String libre y no enum: encerrar el catálogo aquí obligaría a migrar la API por estilo (Spec 2.3).
const visualStyleSchema = z
  .string()
  .max(50)
  .regex(/^[a-z0-9-]+$/, 'Usa un id en minúsculas separado por guiones');

export const BrandSchema = z.strictObject({
  palette: BrandPaletteSchema.default({}),
  typography: BrandTypographySchema.default({
    pairing: DEFAULT_FONT_PAIRING_ID,
    scale: 'normal',
  }),
  assets: BrandAssetsSchema.default({}),
  colorMode: z.enum(COLOR_MODES).default('system'),
  visualStyle: visualStyleSchema.default('classic'),
});

export type Brand = z.infer<typeof BrandSchema>;

// PATCH parcial: lo que no viene, no se toca. Ningún campo lleva `.default()`,
// porque `.optional()` sobre un `.default()` igual rellena el valor y pisaría lo guardado.
export const BrandUpdateSchema = z.strictObject({
  palette: BrandPaletteSchema.optional(),
  typography: z
    .strictObject({
      pairing: z.enum(FONT_PAIRING_IDS as [string, ...string[]]),
      scale: z.enum(TEXT_SCALES),
    })
    .optional(),
  assets: BrandAssetsSchema.optional(),
  colorMode: z.enum(COLOR_MODES).optional(),
  visualStyle: visualStyleSchema.optional(),
});

export type BrandUpdate = z.infer<typeof BrandUpdateSchema>;

export const DEFAULT_BRAND: Brand = BrandSchema.parse({});
