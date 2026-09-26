import type { Tenant } from '../domain/Tenant';
import type { TenantRepository } from '../domain/TenantRepository';

export interface ListTenantsOptions {
  readonly includeDemos?: boolean;
}

export class ListTenantsUseCase {
  constructor(private readonly tenantRepository: TenantRepository) {}

  // Las demos son de prospectos, no clientes: mezclarlas en el listado las metería en la
  // mensualidad, la revisión de calidad y cualquier recorrido "por todos los clientes".
  public async execute(options: ListTenantsOptions = {}): Promise<Tenant[]> {
    const tenants = await this.tenantRepository.findAll();
    return options.includeDemos === true
      ? tenants
      : tenants.filter((tenant) => !tenant.isDemo());
  }
}
