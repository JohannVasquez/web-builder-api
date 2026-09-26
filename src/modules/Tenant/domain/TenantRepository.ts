import type { Tenant, TenantStatus } from './Tenant';
import type { SiteContent } from './SiteContent';
import type { TenantDomainRecord } from './TenantDomain';

/**
 * Clase abstracta usada como token de inyección de dependencias (diod).
 */
export abstract class TenantRepository {
  public abstract findByDomain(domain: string): Promise<Tenant | null>;
  public abstract findBySlug(slug: string): Promise<Tenant | null>;
  /** Admin: para el selector de tenant del panel. */
  public abstract findAll(): Promise<Tenant[]>;
  // Todos los dominios del tenant: cada uno es una clave de caché distinta (SPEC 0.2).
  public abstract findDomainsByTenantId(tenantId: string): Promise<string[]>;
  public abstract findById(id: string): Promise<Tenant | null>;
  // Crea el cliente y escribe su sitio entero en una sola transacción: un cliente a medio
  // sembrar es peor que ninguno, porque parece funcionar hasta que alguien lo abre.
  public abstract createWithContent(
    slug: string,
    name: string,
    domains: readonly string[],
    content: SiteContent,
  ): Promise<Tenant>;
  // Lee el sitio completo de un cliente, para poder copiarlo a otro.
  public abstract readContent(tenantId: string): Promise<SiteContent | null>;

  public abstract setStatus(tenantId: string, status: TenantStatus): Promise<Tenant>;
  public abstract listDomains(tenantId: string): Promise<TenantDomainRecord[]>;
  public abstract addDomain(
    tenantId: string,
    domain: string,
    verified: boolean,
  ): Promise<TenantDomainRecord>;
  public abstract markDomainVerified(
    tenantId: string,
    domainId: string,
  ): Promise<TenantDomainRecord>;
  // Solo uno puede ser el canónico: marcar uno desmarca al anterior en la misma operación.
  public abstract setPrimaryDomain(
    tenantId: string,
    domainId: string,
  ): Promise<TenantDomainRecord>;
  public abstract deleteDomain(tenantId: string, domainId: string): Promise<void>;
}
