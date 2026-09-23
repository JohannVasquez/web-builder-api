import { z } from 'zod';

/**
 * Derechos que la Ley 21.719 le reconoce al titular de los datos. Se les llama ARCOP por sus
 * iniciales; los cinco tienen que poder ejercerse, no solo el borrado.
 */
export const DATA_RIGHTS = [
  'acceso',
  'rectificacion',
  'cancelacion',
  'oposicion',
  'portabilidad',
] as const;
export type DataRight = (typeof DATA_RIGHTS)[number];

export const REQUEST_STATUSES = [
  'pendiente',
  'verificada',
  'resuelta',
  'rechazada',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/**
 * Plazo legal de respuesta. La ley habla de un mes desde la solicitud; se cuenta desde que
 * llega, no desde que se verifica, porque la verificación depende de nosotros.
 */
export const RESPONSE_DAYS = 30;

/**
 * Cuánto vive el enlace de verificación que se manda por correo. Corto a propósito: es lo que
 * impide que alguien pida los datos de otro escribiendo su dirección y esperando a que el
 * dueño abra un correo viejo por descuido.
 */
export const VERIFICATION_HOURS = 24;

export const DataRightsRequestSchema = z.strictObject({
  right: z.enum(DATA_RIGHTS),
  email: z.email('Necesitamos un correo válido para verificar que eres tú').max(255),
  // Solo para rectificación: qué hay que corregir y por qué valor.
  details: z.string().trim().max(2000).default(''),
});

export type DataRightsRequestInput = z.infer<typeof DataRightsRequestSchema>;

export interface DataRightsRequestPrimitives {
  readonly id: string;
  readonly right: DataRight;
  readonly email: string;
  readonly details: string;
  readonly status: RequestStatus;
  readonly createdAt: string;
  readonly verifiedAt: string | null;
  readonly resolvedAt: string | null;
  readonly dueAt: string;
}

export class DataRightsRequest {
  constructor(
    public readonly id: string,
    public readonly right: DataRight,
    public readonly email: string,
    public readonly details: string,
    public readonly status: RequestStatus,
    public readonly createdAt: Date,
    public readonly verifiedAt: Date | null = null,
    public readonly resolvedAt: Date | null = null,
  ) {}

  public dueAt(): Date {
    return new Date(this.createdAt.getTime() + RESPONSE_DAYS * 24 * 60 * 60 * 1000);
  }

  public isOverdue(now = new Date()): boolean {
    return this.resolvedAt === null && now > this.dueAt();
  }

  public toPrimitives(): DataRightsRequestPrimitives {
    return {
      id: this.id,
      right: this.right,
      email: this.email,
      details: this.details,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      verifiedAt: this.verifiedAt?.toISOString() ?? null,
      resolvedAt: this.resolvedAt?.toISOString() ?? null,
      dueAt: this.dueAt().toISOString(),
    };
  }
}
