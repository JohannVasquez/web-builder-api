import type { SiteContent } from '@/modules/Tenant/domain/SiteContent';
import type {
  Demo,
  DemoCreator,
  DemoDiscardReason,
  DemoLinkKind,
  DemoStatus,
} from './Demo';
import type { Prospect, ProspectInput, ProspectPatch } from './Prospect';
import type { DemoVisit } from './DemoVisit';

// El sitio de la demo tal como lo necesita la agencia para ubicarla.
export interface DemoSite {
  readonly tenantId: string;
  readonly slug: string;
  readonly name: string;
  // La única dirección de la demo (`demo-<slug>.<plataforma>`).
  readonly address: string | null;
}

export interface DemoView {
  readonly demo: Demo;
  // Nulo cuando el sitio ya se borró y la fila quedó como rastro anónimo.
  readonly site: DemoSite | null;
  // Lo justo para llamarlo desde la lista "por vencer" sin abrir cada ficha.
  readonly prospect: {
    readonly id: string;
    readonly businessName: string;
    readonly contactName: string | null;
    readonly phone: string | null;
    // Si le llegará el aviso por correo; el correo mismo se ve en la ficha.
    readonly hasEmail: boolean;
  } | null;
}

export interface NewDemo {
  readonly site: {
    readonly slug: string;
    readonly name: string;
    readonly address: string;
    readonly content: SiteContent;
  };
  readonly prospect: { readonly id: string } | { readonly data: ProspectInput };
  readonly templateId: string | null;
  readonly industry: string | null;
  readonly creator: DemoCreator;
  readonly createdAt: Date;
  readonly expiresAt: Date | null;
  // Solo los hashes: el token en claro nunca llega a la base.
  readonly tokenHashes: Readonly<Record<DemoLinkKind, string>>;
}

export interface DemoFilter {
  readonly status?: Exclude<DemoStatus, 'borrada'>;
  readonly prospectId?: string;
  readonly createdBy?: string;
  // Solo las que vencen hasta esta fecha (inclusive), de la más próxima a la más lejana.
  readonly expiresBefore?: Date;
}

export interface DemoExpiryChange {
  readonly expiresAt: Date | null;
  readonly extensionCount: number;
}

export interface DemoAccess {
  readonly kind: DemoLinkKind;
  readonly revokedAt: Date | null;
  readonly demo: Demo;
}

// Una demo que podría necesitar aviso, con lo único del prospecto que el correo necesita.
export interface ExpiryWarningCandidate {
  readonly demo: Demo;
  readonly businessName: string;
  readonly email: string;
}

export interface PurgedDemo {
  // La fila que queda: sin sitio, sin prospecto y sin nada que lo identifique.
  readonly demo: Demo;
  // Archivos del bucket anotados para borrar; salen después, fuera de la transacción.
  readonly pendingFileKeys: readonly string[];
  readonly prospectDeleted: boolean;
}

export interface NewDemoVisit {
  readonly pageSlug: string;
  readonly ipHash: string | null;
  readonly userAgent: string | null;
  readonly visitedAt: Date;
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class DemoRepository {
  // Sitio, prospecto, demo y enlaces en UNA transacción: una demo sin enlaces no la puede ver
  // nadie, y un sitio sin su fila de demo quedaría en estado `demo` para siempre.
  public abstract create(input: NewDemo): Promise<string>;
  public abstract isAddressTaken(tenantSlug: string, address: string): Promise<boolean>;
  // Nula también si ya se borró: una demo borrada no se lista ni se consulta como demo.
  public abstract findById(demoId: string): Promise<DemoView | null>;
  // Incluye las borradas, para poder responder "ya se borró" en vez de "no existe".
  public abstract findDemo(demoId: string): Promise<Demo | null>;
  // Solo escribe si el vencimiento sigue siendo `expected`: dos extensiones a la vez no pueden
  // calcularse sobre la misma fecha y contar como una. Devuelve si escribió.
  public abstract updateExpiry(
    demoId: string,
    expected: Date | null,
    change: DemoExpiryChange,
  ): Promise<boolean>;
  public abstract list(filter: DemoFilter, now: Date): Promise<DemoView[]>;
  public abstract findProspect(prospectId: string): Promise<Prospect | null>;
  public abstract updateProspect(
    prospectId: string,
    patch: ProspectPatch,
  ): Promise<Prospect>;
  // Anula el enlace vigente de ese tipo y deja el nuevo, en la misma operación.
  public abstract replaceAccessToken(
    demoId: string,
    kind: DemoLinkKind,
    tokenHash: string,
  ): Promise<void>;
  public abstract findAccess(tokenHash: string): Promise<DemoAccess | null>;
  // Guarda la visita y mueve los contadores de la demo juntos.
  public abstract recordVisit(demoId: string, visit: NewDemoVisit): Promise<void>;
  public abstract listVisits(
    demoId: string,
    page: number,
    perPage: number,
  ): Promise<{ visits: DemoVisit[]; total: number }>;
  // Vigentes, con sitio, con correo de prospecto y que vencen hasta `until`. Si ya se avisó
  // para su vencimiento lo decide `Demo.needsExpiryWarning`.
  public abstract findExpiryWarningCandidates(
    now: Date,
    until: Date,
  ): Promise<ExpiryWarningCandidate[]>;
  public abstract markExpiryWarningSent(
    demoId: string,
    sentAt: Date,
    forExpiry: Date,
  ): Promise<void>;
  // Deja el motivo sin tocar el último aviso que sí salió: la próxima pasada reintenta.
  public abstract markExpiryWarningFailed(demoId: string, error: string): Promise<void>;
  // Vencidas o descartadas antes de `cutoff`, sin convertir ni borrar. Las "sin vencimiento"
  // no tienen fecha desde la cual contar, así que nunca aparecen.
  public abstract findDueForPurge(cutoff: Date): Promise<Demo[]>;
  // En UNA transacción: anota los archivos del sitio para borrarlos del bucket, borra el
  // sitio (en cascada), las visitas, los enlaces y el prospecto si no le queda otra demo, y deja
  // la fila anónima. Lanza `DemoClosedError` si la demo ya se borró o se convirtió. Con
  // `dueBefore` (la tarea diaria) vuelve a mirar, con la fila tomada, que siga vencida o
  // descartada antes de esa fecha; si no, lanza `DemoNoLongerDueError` sin tocar nada.
  public abstract purge(demoId: string, now: Date, dueBefore?: Date): Promise<PurgedDemo>;
  // Solo escribe si la demo sigue sin resultado; devuelve si escribió. No anula los enlaces: si
  // se recupera, el prospecto vuelve a entrar con el mismo.
  public abstract discard(
    demoId: string,
    reason: DemoDiscardReason | null,
    now: Date,
  ): Promise<boolean>;
  // Solo escribe si sigue descartada desde `discardedAt` (dos recuperaciones a la vez no pueden
  // pisarse); le quita el resultado y el motivo y le pone el vencimiento nuevo.
  public abstract restore(
    demoId: string,
    discardedAt: Date,
    expiresAt: Date,
  ): Promise<boolean>;
  // Los archivos que siguen pendientes, de una demo o de todas.
  public abstract findPendingFiles(demoId?: string): Promise<string[]>;
  public abstract resolvePendingFile(key: string): Promise<void>;
  public abstract failPendingFile(key: string, error: string, at: Date): Promise<void>;
}
