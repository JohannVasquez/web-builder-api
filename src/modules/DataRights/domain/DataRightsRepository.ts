import type { DataRight, DataRightsRequest, RequestStatus } from './DataRightsRequest';

/**
 * Todo lo que la plataforma guarda de una persona en UN cliente. Es lo que se entrega en una
 * solicitud de acceso y lo que se lleva en una de portabilidad.
 */
export interface PersonalDataExport {
  readonly email: string;
  readonly contactMessages: readonly Record<string, unknown>[];
  readonly newsletter: readonly Record<string, unknown>[];
  readonly orders: readonly Record<string, unknown>[];
  readonly consents: readonly Record<string, unknown>[];
}

export interface ErasureResult {
  readonly contactMessagesDeleted: number;
  readonly subscribersDeleted: number;
  /** Los pedidos no se borran: se anonimizan (respaldo tributario). */
  readonly ordersAnonymized: number;
}

export interface NewRequest {
  readonly right: DataRight;
  readonly email: string;
  readonly details: string;
  readonly verificationTokenHash: string;
  readonly verificationExpiresAt: Date;
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class DataRightsRepository {
  public abstract create(
    tenantId: string,
    request: NewRequest,
  ): Promise<DataRightsRequest>;

  /** Busca por hash del token, y solo si no venció. */
  public abstract findVerifiable(
    tokenHash: string,
    now: Date,
  ): Promise<{ tenantId: string; request: DataRightsRequest } | null>;

  public abstract markStatus(id: string, status: RequestStatus, at: Date): Promise<void>;

  public abstract listByStatus(
    tenantId: string,
    status: RequestStatus | null,
  ): Promise<DataRightsRequest[]>;

  /** Reúne todo lo que hay de ese correo en ese cliente. */
  public abstract exportFor(tenantId: string, email: string): Promise<PersonalDataExport>;

  /** Borra o anonimiza, conservando lo que otra ley obliga a guardar. */
  public abstract eraseFor(tenantId: string, email: string): Promise<ErasureResult>;
}
