import type { Tenant } from './Tenant';

/**
 * Clase abstracta usada como token de inyección de dependencias (diod).
 */
export abstract class TenantRepository {
  public abstract findByDomain(domain: string): Promise<Tenant | null>;
  public abstract findBySlug(slug: string): Promise<Tenant | null>;
  /** Admin: para el selector de tenant del panel. */
  public abstract findAll(): Promise<Tenant[]>;
  /**
   * Todos los dominios del tenant, verificados o no. La invalidación de
   * caché (SPEC 0.2) los necesita todos: cada dominio es una clave de caché
   * distinta en el frontend, y uno recién verificado tiene que quedar limpio
   * desde el primer cambio.
   */
  public abstract findDomainsByTenantId(tenantId: number): Promise<string[]>;
}
