import { z } from 'zod';

export const PAYMENT_PROVIDERS = ['none', 'transfer', 'flow'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const ShippingOptionSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Usa solo minúsculas, números y guiones'),
  name: z.string().trim().min(1).max(120),
  priceCents: z.number().int().min(0),
  estimate: z.string().trim().max(120).nullable().default(null),
  // Retiro en tienda no pide dirección; un despacho sí.
  requiresAddress: z.boolean().default(true),
});

export type ShippingOption = z.infer<typeof ShippingOptionSchema>;

export const ShippingOptionsSchema = z
  .array(ShippingOptionSchema)
  .max(10)
  .refine(
    (options) => new Set(options.map((option) => option.code)).size === options.length,
    'Hay dos formas de envío con el mismo código',
  );

export interface StoreSettingsPrimitives {
  readonly isEnabled: boolean;
  readonly currency: string;
  readonly taxIncluded: boolean;
  readonly taxRatePercent: number;
  readonly shippingOptions: readonly ShippingOption[];
  readonly freeShippingThresholdCents: number | null;
  readonly paymentProvider: PaymentProvider;
  readonly notificationEmail: string | null;
  // Página con los términos de compra; nula = la tienda no exige aceptarlos.
  readonly termsPageSlug: string | null;
  // Las credenciales de cobro del cliente nunca viajan hacia afuera; solo se dice si están.
  readonly hasPaymentCredentials: boolean;
}

export class StoreSettings {
  constructor(
    public readonly tenantId: number,
    public readonly isEnabled: boolean,
    public readonly currency: string,
    public readonly taxIncluded: boolean,
    public readonly taxRatePercent: number,
    public readonly shippingOptions: readonly ShippingOption[],
    public readonly freeShippingThresholdCents: number | null,
    public readonly paymentProvider: PaymentProvider,
    public readonly paymentCredentials: Readonly<Record<string, string>>,
    public readonly notificationEmail: string | null,
    public readonly termsPageSlug: string | null = null,
  ) {}

  // Un cliente sin fila de configuración tiene tienda apagada, no una tienda a medias.
  public static disabledFor(tenantId: number): StoreSettings {
    return new StoreSettings(
      tenantId,
      false,
      'CLP',
      true,
      19,
      [],
      null,
      'none',
      {},
      null,
    );
  }

  public shippingOption(code: string): ShippingOption | null {
    return this.shippingOptions.find((option) => option.code === code) ?? null;
  }

  public acceptsOnlinePayment(): boolean {
    return this.paymentProvider !== 'none';
  }

  public toPrimitives(): StoreSettingsPrimitives {
    return {
      isEnabled: this.isEnabled,
      currency: this.currency,
      taxIncluded: this.taxIncluded,
      taxRatePercent: this.taxRatePercent,
      shippingOptions: this.shippingOptions,
      freeShippingThresholdCents: this.freeShippingThresholdCents,
      paymentProvider: this.paymentProvider,
      notificationEmail: this.notificationEmail,
      termsPageSlug: this.termsPageSlug,
      hasPaymentCredentials: Object.keys(this.paymentCredentials).length > 0,
    };
  }
}

export const StoreSettingsUpdateSchema = z.strictObject({
  isEnabled: z.boolean().optional(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
  taxIncluded: z.boolean().optional(),
  taxRatePercent: z.number().int().min(0).max(100).optional(),
  shippingOptions: ShippingOptionsSchema.optional(),
  freeShippingThresholdCents: z.number().int().min(0).nullable().optional(),
  paymentProvider: z.enum(PAYMENT_PROVIDERS).optional(),
  paymentCredentials: z.record(z.string(), z.string()).optional(),
  notificationEmail: z.email().nullable().optional(),
  termsPageSlug: z
    .string()
    .max(255)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Usa la dirección de una página, ej. terminos-de-compra',
    )
    .nullable()
    .optional(),
});

export type StoreSettingsUpdate = z.infer<typeof StoreSettingsUpdateSchema>;

// Las credenciales nunca vuelven al navegador, así que el panel no puede mandar el juego
// completo: solo lo que la persona escribió. Reemplazar borraría en silencio el resto (cambiar
// el RUT se llevaría el banco y la cuenta), así que se combinan. Un valor vacío es un campo
// que no se tocó, no una orden de borrarlo.
export const mergePaymentCredentials = (
  current: Readonly<Record<string, string>>,
  incoming: Readonly<Record<string, string>>,
): Record<string, string> => {
  const merged: Record<string, string> = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (value.trim() !== '') {
      merged[key] = value.trim();
    }
  }
  return merged;
};
