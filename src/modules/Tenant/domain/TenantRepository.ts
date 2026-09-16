import type { Tenant } from './Tenant';
import type { SiteContent } from './SiteContent';

/**
 * Clase abstracta usada como token de inyección de dependencias (diod).
 */
export abstract class TenantRepository {
  public abstract findByDomain(domain: string): Promise<Tenant | null>;
  public abstract findBySlug(slug: string): Promise<Tenant | null>;
  /** Admin: para el selector de tenant del panel. */
  public abstract findAll(): Promise<Tenant[]>;
  // Todos los dominios del tenant: cada uno es una clave de caché distinta (SPEC 0.2).
  public abstract findDomainsByTenantId(tenantId: number): Promise<string[]>;
  public abstract findById(id: number): Promise<Tenant | null>;
  // Crea el cliente y escribe su sitio entero en una sola transacción: un cliente a medio
  // sembrar es peor que ninguno, porque parece funcionar hasta que alguien lo abre.
  public abstract createWithContent(
    slug: string,
    name: string,
    domains: readonly string[],
    content: SiteContent,
  ): Promise<Tenant>;
  // Lee el sitio completo de un cliente, para poder copiarlo a otro.
  public abstract readContent(tenantId: number): Promise<SiteContent | null>;
}
