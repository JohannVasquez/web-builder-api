import { z } from 'zod';

const normalizeWhatsApp = (val: string): string => {
  const digits = val.replace(/\D/g, '');
  if (digits.startsWith('56')) return digits;
  // Si no tiene código de país pero parece número chileno de 8 o 9 dígitos
  if (digits.length === 8 || digits.length === 9) return `56${digits}`;
  return digits;
};

const whatsappSchema = z
  .string()
  .transform((v) => v.trim())
  .superRefine((val, ctx) => {
    if (!val) return;
    const normalized = normalizeWhatsApp(val);
    if (!normalized.startsWith('56') || normalized.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'El número de WhatsApp debe ser un número válido de Chile (ej: +56 9 1234 5678)',
      });
    }
  })
  .transform((val) => (val ? normalizeWhatsApp(val) : val));

const emailsSchema = z
  .string()
  .transform((v) => v.trim())
  .superRefine((val, ctx) => {
    if (!val) return;
    const emails = val.split(',').map((e) => e.trim());
    for (const email of emails) {
      const emailResult = z.string().email().safeParse(email);
      if (!emailResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `El correo "${email}" no es válido. Múltiples correos deben separarse por coma.`,
        });
        return;
      }
    }
  })
  .transform((val) => {
    if (!val) return val;
    return val
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .join(',');
  });

const urlSchema = z
  .string()
  .trim()
  .superRefine((val, ctx) => {
    if (!val) return;
    // `url()` acepta cualquier protocolo: sin este filtro un `ftp://` pasaría contradiciendo el mensaje.
    const result = z.string().url().safeParse(val);
    if (!result.success || !/^https?:\/\//i.test(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe ser una URL válida que empiece con http:// o https://',
      });
    }
  });

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato de hora inválido (esperado HH:MM)');

const openingHoursDaySchema = z
  .object({
    isOpen: z.boolean(),
    slots: z
      .array(
        z.object({
          open: timeSchema,
          close: timeSchema,
        }),
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isOpen) {
      if (!data.slots || data.slots.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe incluir al menos un horario si está abierto',
        });
        return;
      }
      for (const slot of data.slots) {
        if (slot.close <= slot.open) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'La hora de cierre debe ser posterior a la de apertura',
          });
        }
      }
    }
  });

const openingHoursSchema = z.string().superRefine((val, ctx) => {
  if (!val) return; // allows empty string
  try {
    const parsed = JSON.parse(val) as unknown;
    const objSchema = z.object({
      monday: openingHoursDaySchema,
      tuesday: openingHoursDaySchema,
      wednesday: openingHoursDaySchema,
      thursday: openingHoursDaySchema,
      friday: openingHoursDaySchema,
      saturday: openingHoursDaySchema,
      sunday: openingHoursDaySchema,
    });
    const result = objSchema.safeParse(parsed);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: issue.message,
          path: issue.path,
        });
      });
    }
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El valor de horarios debe ser un JSON válido o cadena vacía',
    });
  }
});

const booleanStringSchema = z
  .union([z.boolean(), z.enum(['true', 'false']), z.literal('')])
  .transform((v) =>
    v === true || v === 'true' ? 'true' : v === false || v === 'false' ? 'false' : '',
  );

export const globalSettingsSchemas = z
  .object({
    siteName: z.string().trim(),
    tagline: z.string().trim(),
    contactEmail: emailsSchema,
    contactPhone: z.string().trim(),
    whatsappNumber: whatsappSchema,
    address: z.string().trim(),
    instagramUrl: urlSchema,
    facebookUrl: urlSchema,
    tiktokUrl: urlSchema,
    linkedinUrl: urlSchema,
    youtubeUrl: urlSchema,
    xUrl: urlSchema,
    customLinkUrl: urlSchema,
    customLinkLabel: z.string().trim(),
    googleAnalyticsId: z
      .string()
      .trim()
      .superRefine((val, ctx) => {
        if (!val) return;
        if (!/^G-[A-Z0-9]+$/i.test(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'El ID de Google Analytics debe empezar con G- seguido de letras y números',
          });
        }
      }),
    metaPixelId: z
      .string()
      .trim()
      .superRefine((val, ctx) => {
        if (!val) return;
        if (!/^\d+$/.test(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'El ID de Meta Pixel debe contener solo números',
          });
        }
      }),
    googleTagManagerId: z
      .string()
      .trim()
      .superRefine((val, ctx) => {
        if (!val) return;
        if (!/^GTM-[A-Z0-9]+$/i.test(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'El ID de Google Tag Manager debe empezar con GTM- seguido de letras y números',
          });
        }
      }),
    cookieBanner: booleanStringSchema,
    openingHours: openingHoursSchema,
    googleSiteVerification: z
      .string()
      .trim()
      .superRefine((val, ctx) => {
        if (!val) return;
        if (!/^[a-zA-Z0-9_-]+$/.test(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'El código de verificación de Google contiene caracteres inválidos (no ingrese código HTML)',
          });
        }
      }),
    bingSiteVerification: z
      .string()
      .trim()
      .superRefine((val, ctx) => {
        if (!val) return;
        if (!/^[a-fA-F0-9]+$/.test(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'El código de verificación de Bing debe contener solo letras de la A a la F y números',
          });
        }
      }),
    siteUnderConstruction: booleanStringSchema,
  })
  .partial();

export type GlobalSettingsInput = z.infer<typeof globalSettingsSchemas>;
