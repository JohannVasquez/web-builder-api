import type { Redirect, RedirectStatusCode } from './Redirect';

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class RedirectRepository {
  public abstract listByTenant(tenantId: string): Promise<Redirect[]>;
  public abstract findByFrom(
    tenantId: string,
    fromPath: string,
  ): Promise<Redirect | null>;
  /** Idempotente: repetir el mismo origen actualiza el destino en vez de fallar. */
  public abstract upsert(
    tenantId: string,
    fromPath: string,
    toPath: string,
    statusCode: RedirectStatusCode,
  ): Promise<Redirect>;
  public abstract delete(tenantId: string, id: string): Promise<void>;
}
