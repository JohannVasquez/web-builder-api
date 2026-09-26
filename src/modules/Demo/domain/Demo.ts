export const DEMO_LINK_KINDS = ['prospect', 'team'] as const;
export type DemoLinkKind = (typeof DEMO_LINK_KINDS)[number];

// Estado derivado, no guardado: vencer depende de la hora de la consulta, y guardarlo obligaría
// a una tarea que lo mantenga al día.
export const DEMO_STATUSES = ['vigente', 'vencida', 'convertida', 'descartada'] as const;
export type DemoStatus = (typeof DEMO_STATUSES)[number];

export const DEMO_OUTCOMES = ['converted', 'discarded'] as const;
export type DemoOutcome = (typeof DEMO_OUTCOMES)[number];

export const DEMO_VALIDITY_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export const demoExpiryFrom = (from: Date): Date =>
  new Date(from.getTime() + DEMO_VALIDITY_DAYS * DAY_MS);

// Quién creó la demo, congelado como en el registro de actividad: la métrica "por vendedor"
// tiene que sobrevivir a que la persona o la clave dejen de existir.
export interface DemoCreator {
  readonly type: 'admin' | 'apiKey';
  readonly id: string | null;
  readonly name: string;
}

export interface DemoVisitCounters {
  readonly count: number;
  readonly firstAt: Date | null;
  readonly lastAt: Date | null;
}

export interface DemoPrimitives {
  readonly id: string;
  readonly status: DemoStatus;
  readonly tenantId: string | null;
  readonly prospectId: string | null;
  readonly templateId: string | null;
  readonly industry: string | null;
  readonly createdBy: DemoCreator;
  readonly createdAt: string;
  readonly expiresAt: string | null;
  readonly outcome: DemoOutcome | null;
  readonly outcomeAt: string | null;
  readonly visits: {
    readonly count: number;
    readonly firstAt: string | null;
    readonly lastAt: string | null;
  };
}

export class Demo {
  constructor(
    public readonly id: string,
    public readonly tenantId: string | null,
    public readonly prospectId: string | null,
    public readonly templateId: string | null,
    public readonly industry: string | null,
    public readonly creator: DemoCreator,
    public readonly createdAt: Date,
    // Nulo = sin vencimiento.
    public readonly expiresAt: Date | null,
    public readonly outcome: DemoOutcome | null,
    public readonly outcomeAt: Date | null,
    public readonly visits: DemoVisitCounters,
    public readonly purgedAt: Date | null,
  ) {}

  // El resultado manda sobre el vencimiento: una demo convertida no "vence" después.
  public status(now: Date = new Date()): DemoStatus {
    if (this.outcome === 'converted') {
      return 'convertida';
    }
    if (this.outcome === 'discarded') {
      return 'descartada';
    }
    if (this.expiresAt !== null && this.expiresAt.getTime() <= now.getTime()) {
      return 'vencida';
    }
    return 'vigente';
  }

  // El prospecto entra solo mientras la demo está vigente. El equipo entra mientras el sitio
  // exista, también vencida o descartada: es quien decide si extenderla o dejarla ir.
  public admits(kind: DemoLinkKind, now: Date = new Date()): boolean {
    if (this.tenantId === null || this.purgedAt !== null) {
      return false;
    }
    return kind === 'team' || this.status(now) === 'vigente';
  }

  public toPrimitives(now: Date = new Date()): DemoPrimitives {
    return {
      id: this.id,
      status: this.status(now),
      tenantId: this.tenantId,
      prospectId: this.prospectId,
      templateId: this.templateId,
      industry: this.industry,
      createdBy: this.creator,
      createdAt: this.createdAt.toISOString(),
      expiresAt: this.expiresAt?.toISOString() ?? null,
      outcome: this.outcome,
      outcomeAt: this.outcomeAt?.toISOString() ?? null,
      visits: {
        count: this.visits.count,
        firstAt: this.visits.firstAt?.toISOString() ?? null,
        lastAt: this.visits.lastAt?.toISOString() ?? null,
      },
    };
  }
}
