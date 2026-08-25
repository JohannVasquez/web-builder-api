import type { Tenant } from './Tenant';

/**
 * Clase abstracta usada como token de inyección de dependencias (diod).
 */
export abstract class TenantRepository {
  public abstract findByDomain(domain: string): Promise<Tenant | null>;
  public abstract findBySlug(slug: string): Promise<Tenant | null>;
  /** Admin: para el selector de tenant del panel. */
  public abstract findAll(): Promise<Tenant[]>;
}
