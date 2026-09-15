import { TenantRepository } from '../../Tenant/domain/TenantRepository';
import { SiteCacheInvalidator } from '../domain/SiteCacheInvalidator';

/**
 * Traduce "cambió el tenant N" a "invalida estos dominios". Un tenant puede
 * llegar por varios dominios a la vez (subdominio de la plataforma + dominio
 * propio), y cada uno es una clave de caché distinta en el frontend: hay que
 * invalidarlos todos o el cambio se vería por una URL y no por la otra.
 */
export class InvalidateTenantCacheUseCase {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly invalidator: SiteCacheInvalidator,
  ) {}

  public async execute(tenantId: number): Promise<void> {
    const domains = await this.tenantRepository.findDomainsByTenantId(tenantId);
    await this.invalidator.invalidate(domains);
  }
}
