import { z } from 'zod';

export interface TenantDomainPrimitives {
  readonly id: number;
  readonly domain: string;
  readonly isPrimary: boolean;
  readonly isVerified: boolean;
  readonly verifiedAt: string | null;
}

export class TenantDomainRecord {
  constructor(
    public readonly id: number,
    public readonly domain: string,
    public readonly isPrimary: boolean,
    public readonly verifiedAt: Date | null,
  ) {}

  public isVerified(): boolean {
    return this.verifiedAt !== null;
  }

  public toPrimitives(): TenantDomainPrimitives {
    return {
      id: this.id,
      domain: this.domain,
      isPrimary: this.isPrimary,
      isVerified: this.isVerified(),
      verifiedAt: this.verifiedAt?.toISOString() ?? null,
    };
  }
}

export const DomainSchema = z.strictObject({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(255)
    .regex(/^[a-z0-9.-]+$/, 'Usa un dominio válido, sin protocolo ni puerto')
    .refine(
      (value) => value.includes('.'),
      'Falta el punto: usa algo como "mitienda.cl"',
    ),
  isPrimary: z.boolean().default(false),
});

export type DomainInput = z.infer<typeof DomainSchema>;

// El nombre del registro TXT que hay que crear para demostrar que el dominio es del cliente.
export const VERIFICATION_HOST_PREFIX = '_webbuilder';

export const verificationHostFor = (domain: string): string =>
  `${VERIFICATION_HOST_PREFIX}.${domain}`;
