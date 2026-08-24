import { DEFAULT_TENANT_SLUG, type Tenant } from '../domain/Tenant';
import { normalizeDomain } from '../domain/domainName';
import { TenantRepository } from '../domain/TenantRepository';
import { TenantNotFoundError } from '../domain/TenantNotFoundError';

/**
 * Resuelve el tenant de una petición a partir del dominio del sitio
 * (header `X-Tenant-Domain`, que el frontend llena con su `Host`). Si el
 * dominio no está registrado (o no viene), se cae al tenant `default` para
 * no romper el sitio principal.
 */
export class ResolveTenantUseCase {
  constructor(private readonly tenantRepository: TenantRepository) {}

  public async execute(rawDomain: string | undefined): Promise<Tenant> {
    const domain = normalizeDomain(rawDomain);

    if (domain !== undefined) {
      const tenant = await this.tenantRepository.findByDomain(domain);
      if (tenant !== null) {
        return tenant;
      }
    }

    const fallback = await this.tenantRepository.findBySlug(DEFAULT_TENANT_SLUG);
    if (fallback === null) {
      throw new TenantNotFoundError(domain);
    }
    return fallback;
  }
}
