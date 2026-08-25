import type { Tenant } from '../domain/Tenant';
import type { TenantRepository } from '../domain/TenantRepository';

export class ListTenantsUseCase {
  constructor(private readonly tenantRepository: TenantRepository) {}

  public async execute(): Promise<Tenant[]> {
    return this.tenantRepository.findAll();
  }
}
