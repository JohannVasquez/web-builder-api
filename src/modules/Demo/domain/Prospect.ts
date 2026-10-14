import { z } from 'zod';

// Vacío se guarda como nulo, para que "sin teléfono" no tenga dos formas de escribirse.
const emptyToNull = (value: string): string | null => (value === '' ? null : value);

export const ProspectInputSchema = z.strictObject({
  businessName: z.string().trim().min(2).max(255),
  contactName: z.string().trim().max(160).transform(emptyToNull).nullable().optional(),
  phone: z.string().trim().max(40).transform(emptyToNull).nullable().optional(),
  email: z
    .union([
      z.literal('').transform(() => null),
      z.email('Ingresa un correo válido').max(255),
    ])
    .nullable()
    .optional(),
  industry: z.string().trim().max(120).transform(emptyToNull).nullable().optional(),
  source: z.string().trim().max(120).transform(emptyToNull).nullable().optional(),
  notes: z.string().trim().max(5000).transform(emptyToNull).nullable().optional(),
});

export type ProspectInput = z.infer<typeof ProspectInputSchema>;

export const ProspectPatchSchema = ProspectInputSchema.partial().refine(
  (patch) => Object.keys(patch).length > 0,
  'Manda al menos un campo del prospecto para cambiar.',
);

export type ProspectPatch = z.infer<typeof ProspectPatchSchema>;

export interface ProspectPrimitives {
  readonly id: string;
  readonly businessName: string;
  readonly contactName: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly industry: string | null;
  readonly source: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export class Prospect {
  constructor(
    public readonly id: string,
    public readonly businessName: string,
    public readonly contactName: string | null,
    public readonly phone: string | null,
    public readonly email: string | null,
    public readonly industry: string | null,
    public readonly source: string | null,
    public readonly notes: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  public toPrimitives(): ProspectPrimitives {
    return {
      id: this.id,
      businessName: this.businessName,
      contactName: this.contactName,
      phone: this.phone,
      email: this.email,
      industry: this.industry,
      source: this.source,
      notes: this.notes,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
