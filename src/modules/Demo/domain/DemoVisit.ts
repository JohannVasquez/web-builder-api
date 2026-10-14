// Una página que el prospecto abrió con su enlace. Sin la IP: solo su huella.
export interface DemoVisitPrimitives {
  readonly id: string;
  readonly pageSlug: string;
  readonly visitedAt: string;
  readonly userAgent: string | null;
}

export class DemoVisit {
  constructor(
    public readonly id: string,
    public readonly pageSlug: string,
    public readonly visitedAt: Date,
    public readonly ipHash: string | null,
    public readonly userAgent: string | null,
  ) {}

  // La huella de la IP no sale: sirve para agrupar en una métrica, no para mostrarla.
  public toPrimitives(): DemoVisitPrimitives {
    return {
      id: this.id,
      pageSlug: this.pageSlug,
      visitedAt: this.visitedAt.toISOString(),
      userAgent: this.userAgent,
    };
  }
}

// Un agente de usuario puede medir kilobytes; para saber "desde qué teléfono" basta el comienzo.
export const USER_AGENT_MAX_LENGTH = 255;

export const trimUserAgent = (userAgent: string | undefined): string | null => {
  const trimmed = userAgent?.trim() ?? '';
  return trimmed === '' ? null : trimmed.slice(0, USER_AGENT_MAX_LENGTH);
};
