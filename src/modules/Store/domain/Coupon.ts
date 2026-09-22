import { z } from 'zod';

export const DISCOUNT_TYPES = ['percentage', 'amount'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export interface CouponPrimitives {
  readonly id: string;
  readonly code: string;
  readonly discountType: DiscountType;
  readonly value: number;
  readonly minimumCents: number | null;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly maxUses: number | null;
  readonly usedCount: number;
  readonly isActive: boolean;
}

export class Coupon {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly discountType: DiscountType,
    public readonly value: number,
    public readonly minimumCents: number | null,
    public readonly startsAt: Date | null,
    public readonly endsAt: Date | null,
    public readonly maxUses: number | null,
    public readonly usedCount: number,
    public readonly isActive: boolean,
  ) {}

  // Devuelve el motivo por el que no sirve, o `null` si se puede usar. Un solo lugar
  // decide, para que el precio que se muestra y el que se cobra no puedan discrepar.
  public rejectionFor(subtotalCents: number, now: Date): string | null {
    if (!this.isActive) {
      return 'Ese cupón ya no está disponible.';
    }
    if (this.startsAt !== null && now < this.startsAt) {
      return 'Ese cupón todavía no empieza a regir.';
    }
    if (this.endsAt !== null && now > this.endsAt) {
      return 'Ese cupón ya venció.';
    }
    if (this.maxUses !== null && this.usedCount >= this.maxUses) {
      return 'Ese cupón ya se usó todas las veces permitidas.';
    }
    if (this.minimumCents !== null && subtotalCents < this.minimumCents) {
      return `Ese cupón sirve desde $${this.minimumCents.toLocaleString('es-CL')} de compra.`;
    }
    return null;
  }

  // Nunca descuenta más que el subtotal: un total negativo no significa nada.
  public discountFor(subtotalCents: number): number {
    const raw =
      this.discountType === 'percentage'
        ? Math.floor((subtotalCents * this.value) / 100)
        : this.value;
    return Math.max(0, Math.min(raw, subtotalCents));
  }

  public toPrimitives(): CouponPrimitives {
    return {
      id: this.id,
      code: this.code,
      discountType: this.discountType,
      value: this.value,
      minimumCents: this.minimumCents,
      startsAt: this.startsAt?.toISOString() ?? null,
      endsAt: this.endsAt?.toISOString() ?? null,
      maxUses: this.maxUses,
      usedCount: this.usedCount,
      isActive: this.isActive,
    };
  }
}

const isoDate = z.iso.datetime({ offset: true }).or(z.iso.datetime());

const couponFields = z.strictObject({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9-]+$/, 'Usa solo letras, números y guiones')
    .transform((value) => value.toUpperCase()),
  discountType: z.enum(DISCOUNT_TYPES),
  value: z.number().int().positive(),
  minimumCents: z.number().int().min(0).nullable().default(null),
  startsAt: isoDate.nullable().default(null),
  endsAt: isoDate.nullable().default(null),
  maxUses: z.number().int().positive().nullable().default(null),
  isActive: z.boolean().default(true),
});

const noAbsurdPercentage = (input: {
  discountType?: DiscountType;
  value?: number;
}): boolean =>
  input.discountType !== 'percentage' || input.value === undefined || input.value <= 100;

const PERCENTAGE_MESSAGE = 'Un descuento por porcentaje no puede pasar de 100';

export const CouponInputSchema = couponFields.refine(
  noAbsurdPercentage,
  PERCENTAGE_MESSAGE,
);

// Se parte del objeto sin refinar: zod no deja hacer `.partial()` sobre uno refinado.
export const CouponUpdateSchema = couponFields
  .partial()
  .refine(noAbsurdPercentage, PERCENTAGE_MESSAGE);

export type CouponInput = z.infer<typeof CouponInputSchema>;
export type CouponUpdate = z.infer<typeof CouponUpdateSchema>;
