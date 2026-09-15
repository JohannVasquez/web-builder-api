import { TenantRepository } from '../../Tenant/domain/TenantRepository';
import { SiteCacheInvalidator } from '../domain/SiteCacheInvalidator';

// Invalida TODOS los dominios del tenant: si no, el cambio se vería por una URL y no por la otra.
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
