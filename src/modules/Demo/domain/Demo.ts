import { addDays } from './DemoLifecycleConfig';
import { DemoClosedError, DemoNeverExpiresError } from './errors';

export const DEMO_LINK_KINDS = ['prospect', 'team'] as const;
export type DemoLinkKind = (typeof DEMO_LINK_KINDS)[number];

// Estado derivado, no guardado: vencer depende de la hora de la consulta, y guardarlo obligaría
// a una tarea que lo mantenga al día.
export const DEMO_STATUSES = ['vigente', 'vencida', 'convertida', 'descartada'] as const;
export type DemoStatus = (typeof DEMO_STATUSES)[number];

export const DEMO_OUTCOMES = ['converted', 'discarded'] as const;
export type DemoOutcome = (typeof DEMO_OUTCOMES)[number];

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
  readonly neverExpires: boolean;
  readonly extensionCount: number;
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
    public readonly extensionCount: number = 0,
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

  // Una extensión suma el plazo a lo que sea más tarde entre ahora y el vencimiento actual: a
  // una vigente le alarga la fecha, a una vencida la reactiva desde hoy.
  public extendedExpiry(now: Date, durationDays: number): Date {
    this.assertOpen();
    if (this.expiresAt === null) {
      throw new DemoNeverExpiresError();
    }
    const base = Math.max(now.getTime(), this.expiresAt.getTime());
    return addDays(new Date(base), durationDays);
  }

  // Desmarcar "sin vencimiento" le devuelve el plazo desde hoy; si ya vencía, la deja como
  // estaba, para que repetir la petición no le cambie la fecha.
  public expiryAfterSetting(
    neverExpires: boolean,
    now: Date,
    durationDays: number,
  ): Date | null {
    this.assertOpen();
    if (neverExpires) {
      return null;
    }
    return this.expiresAt ?? addDays(now, durationDays);
  }

  // Vigente y con fecha dentro de la ventana de aviso: la lista "por vencer" y el correo.
  public isAboutToExpire(now: Date, warningDays: number): boolean {
    return (
      this.status(now) === 'vigente' &&
      this.expiresAt !== null &&
      this.expiresAt.getTime() <= addDays(now, warningDays).getTime()
    );
  }

  // Con resultado o ya borrada, el vencimiento no se toca: convertida es un cliente, y
  // descartada o borrada es una decisión que no se revierte extendiéndola.
  private assertOpen(): void {
    if (this.purgedAt !== null || this.tenantId === null) {
      throw new DemoClosedError('Esa demo ya se borró.');
    }
    if (this.outcome === 'converted') {
      throw new DemoClosedError(
        'Esa demo ya es un cliente: no tiene vencimiento que cambiar.',
      );
    }
    if (this.outcome === 'discarded') {
      throw new DemoClosedError('Esa demo está descartada: no se puede extender.');
    }
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
      neverExpires: this.expiresAt === null,
      extensionCount: this.extensionCount,
      visits: {
        count: this.visits.count,
        firstAt: this.visits.firstAt?.toISOString() ?? null,
        lastAt: this.visits.lastAt?.toISOString() ?? null,
      },
    };
  }
}
