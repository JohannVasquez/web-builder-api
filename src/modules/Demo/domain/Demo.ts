import { addDays } from './DemoLifecycleConfig';
import { DemoClosedError, DemoNeverExpiresError } from './errors';

export const DEMO_LINK_KINDS = ['prospect', 'team'] as const;
export type DemoLinkKind = (typeof DEMO_LINK_KINDS)[number];

// Estado derivado, no guardado: vencer depende de la hora de la consulta, y guardarlo obligaría
// a una tarea que lo mantenga al día.
// `borrada` es el rastro anónimo que queda para métricas: ya no se lista ni se consulta.
export const DEMO_STATUSES = [
  'vigente',
  'vencida',
  'convertida',
  'descartada',
  'borrada',
] as const;
export type DemoStatus = (typeof DEMO_STATUSES)[number];

export const DEMO_OUTCOMES = ['converted', 'discarded'] as const;
export type DemoOutcome = (typeof DEMO_OUTCOMES)[number];

// Lista cerrada y no texto libre: sirve a las métricas ("¿por qué no compran?") y no puede
// nombrar al prospecto, así que sobrevive al borrado en la fila anónima.
export const DEMO_DISCARD_REASONS = [
  'no-interesado',
  'precio',
  'ya-tiene-sitio',
  'no-responde',
  'otro',
] as const;
export type DemoDiscardReason = (typeof DEMO_DISCARD_REASONS)[number];

// Lo pone la conversión en las otras propuestas al mismo prospecto. No se puede elegir desde
// afuera: no es un "no" del prospecto, y contarlo como tal ensuciaría las métricas.
export const SIBLING_CONVERTED_REASON = 'otra-propuesta';
export type StoredDiscardReason = DemoDiscardReason | typeof SIBLING_CONVERTED_REASON;
export const STORED_DISCARD_REASONS: readonly StoredDiscardReason[] = [
  ...DEMO_DISCARD_REASONS,
  SIBLING_CONVERTED_REASON,
];

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

// El último aviso de vencimiento al prospecto. `forExpiry` es el vencimiento que se avisó:
// si la demo se extiende deja de coincidir y corresponde un aviso nuevo.
export interface DemoExpiryWarning {
  readonly sentAt: Date | null;
  readonly forExpiry: Date | null;
  readonly error: string | null;
}

export const NO_EXPIRY_WARNING: DemoExpiryWarning = {
  sentAt: null,
  forExpiry: null,
  error: null,
};

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
  readonly discardReason: StoredDiscardReason | null;
  readonly purgedAt: string | null;
  readonly neverExpires: boolean;
  readonly extensionCount: number;
  readonly expiryWarning: {
    readonly sentAt: string | null;
    readonly expiresAt: string | null;
    readonly error: string | null;
  };
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
    public readonly expiryWarning: DemoExpiryWarning = NO_EXPIRY_WARNING,
    public readonly discardReason: StoredDiscardReason | null = null,
  ) {}

  // El resultado manda sobre el vencimiento: una demo convertida no "vence" después.
  public status(now: Date = new Date()): DemoStatus {
    if (this.purgedAt !== null) {
      return 'borrada';
    }
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

  // Un aviso por cada vencimiento: si ya salió para esta fecha no se repite, y si la demo se
  // extendió después, la fecha nueva merece el suyo. Un intento fallido no cuenta como aviso.
  public needsExpiryWarning(now: Date, warningDays: number): boolean {
    return (
      this.isAboutToExpire(now, warningDays) &&
      this.expiryWarning.forExpiry?.getTime() !== this.expiresAt?.getTime()
    );
  }

  // Desde cuándo corresponde borrarla: el período de gracia cuenta desde el vencimiento, o
  // desde el descarte. Nula si nunca: convertida (es un cliente), sin vencimiento o ya borrada.
  public purgeDueAt(graceDays: number): Date | null {
    if (this.purgedAt !== null || this.outcome === 'converted') {
      return null;
    }
    const from = this.outcome === 'discarded' ? this.outcomeAt : this.expiresAt;
    return from === null ? null : addDays(from, graceDays);
  }

  public isPurgeDue(now: Date, graceDays: number): boolean {
    const dueAt = this.purgeDueAt(graceDays);
    return dueAt !== null && dueAt.getTime() < now.getTime();
  }

  // El borrado manual no espera la gracia, pero una convertida ya es un cliente: se borra, si
  // acaso, como cliente.
  public assertCanBePurged(): void {
    if (this.purgedAt !== null) {
      throw new DemoClosedError('Esa demo ya se borró.');
    }
    if (this.outcome === 'converted') {
      throw new DemoClosedError(
        'Esa demo ya es un cliente: no se puede borrar como demo.',
      );
    }
  }

  // Solo una demo sin resultado, vigente o vencida: la vencida es la del prospecto que llamó
  // tarde. Una descartada primero se recupera, para que la decisión quede a la vista.
  public assertCanBeConverted(): void {
    this.assertNotPurged();
    if (this.outcome === 'converted') {
      throw new DemoClosedError('Esa demo ya es un cliente.');
    }
    if (this.outcome === 'discarded') {
      throw new DemoClosedError(
        'Esa demo está descartada. Si el prospecto cambió de opinión, recupérala primero.',
      );
    }
  }

  // Falso si ya estaba descartada: descartar dos veces no cambia nada, ni el motivo ni la
  // fecha desde la que corre la gracia.
  public needsDiscard(): boolean {
    this.assertNotPurged();
    if (this.outcome === 'converted') {
      throw new DemoClosedError('Esa demo ya es un cliente: no se puede descartar.');
    }
    return this.outcome !== 'discarded';
  }

  // Se recupera solo mientras no le toque borrarse: pasada la gracia, la tarea diaria puede
  // estar borrándola en este mismo momento.
  public assertCanBeRestored(now: Date, graceDays: number): void {
    this.assertNotPurged();
    if (this.outcome === 'converted') {
      throw new DemoClosedError('Esa demo ya es un cliente.');
    }
    if (this.outcome !== 'discarded') {
      throw new DemoClosedError(
        'Esa demo no está descartada: no hay nada que recuperar.',
      );
    }
    if (this.isPurgeDue(now, graceDays)) {
      throw new DemoClosedError(
        `Pasaron más de ${String(graceDays)} días desde que se descartó y ya se va a borrar. Arma una demo nueva.`,
      );
    }
  }

  private assertNotPurged(): void {
    if (this.purgedAt !== null || this.tenantId === null) {
      throw new DemoClosedError('Esa demo ya se borró.');
    }
  }

  // Con resultado o ya borrada, el vencimiento no se toca: convertida es un cliente, y
  // descartada o borrada es una decisión que no se revierte extendiéndola.
  private assertOpen(): void {
    this.assertNotPurged();
    if (this.outcome === 'converted') {
      throw new DemoClosedError(
        'Esa demo ya es un cliente: no tiene vencimiento que cambiar.',
      );
    }
    if (this.outcome === 'discarded') {
      throw new DemoClosedError(
        'Esa demo está descartada: no se puede extender. Recupérala primero.',
      );
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
      discardReason: this.discardReason,
      purgedAt: this.purgedAt?.toISOString() ?? null,
      neverExpires: this.expiresAt === null,
      extensionCount: this.extensionCount,
      expiryWarning: {
        sentAt: this.expiryWarning.sentAt?.toISOString() ?? null,
        expiresAt: this.expiryWarning.forExpiry?.toISOString() ?? null,
        error: this.expiryWarning.error,
      },
      visits: {
        count: this.visits.count,
        firstAt: this.visits.firstAt?.toISOString() ?? null,
        lastAt: this.visits.lastAt?.toISOString() ?? null,
      },
    };
  }
}
