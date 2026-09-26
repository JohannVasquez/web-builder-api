import { z } from 'zod';

/**
 * Finalidades por las que se pide permiso. Están separadas porque la ley no admite un único
 * "acepto": medir el tráfico y perfilar para publicidad son cosas distintas, y la segunda
 * además implica transferir datos fuera del país.
 *
 * `necessary` no se consiente ni se rechaza (sin ella el sitio no funciona), pero se registra
 * para que el registro diga exactamente qué se le mostró a la persona.
 */
export const CONSENT_PURPOSES = ['necessary', 'analytics', 'advertising'] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export const CONSENT_SOURCES = ['cookies', 'contact', 'newsletter'] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

export const ConsentInputSchema = z.strictObject({
  // Un identificador que el navegador guarda, o el hash de un correo. Nunca el correo en
  // claro: este registro se conserva mucho más que el dato que lo originó.
  subject: z.string().trim().min(8).max(128),
  source: z.enum(CONSENT_SOURCES),
  purposes: z.array(z.enum(CONSENT_PURPOSES)).max(CONSENT_PURPOSES.length).default([]),
  textVersion: z.string().trim().min(1).max(40),
});

export type ConsentInput = z.infer<typeof ConsentInputSchema>;

export interface ConsentPrimitives {
  readonly id: string;
  readonly subject: string;
  readonly source: ConsentSource;
  readonly purposes: readonly ConsentPurpose[];
  readonly textVersion: string;
  readonly createdAt: string;
}

export class ConsentRecord {
  constructor(
    public readonly id: string,
    public readonly subject: string,
    public readonly source: ConsentSource,
    public readonly purposes: readonly ConsentPurpose[],
    public readonly textVersion: string,
    public readonly createdAt: Date,
  ) {}

  public allows(purpose: ConsentPurpose): boolean {
    return this.purposes.includes(purpose);
  }

  /**
   * Un consentimiento vale solo sobre el texto que la persona leyó. Si el texto cambió, hay
   * que volver a preguntar: no se puede dar por aceptado algo que nadie vio.
   */
  public appliesTo(textVersion: string): boolean {
    return this.textVersion === textVersion;
  }

  public toPrimitives(): ConsentPrimitives {
    return {
      id: this.id,
      subject: this.subject,
      source: this.source,
      purposes: this.purposes,
      textVersion: this.textVersion,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
