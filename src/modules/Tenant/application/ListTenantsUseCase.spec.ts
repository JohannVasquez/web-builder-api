import { Tenant } from '../domain/Tenant';
import type { TenantRepository } from '../domain/TenantRepository';
import { ListTenantsUseCase } from './ListTenantsUseCase';

describe('ListTenantsUseCase', () => {
  const client = new Tenant('018f6f1a-0000-7000-8000-000000000001', 'luna', 'Luna', null);
  const demo = new Tenant(
    '018f6f1a-0000-7000-8000-000000000002',
    'demo-sol',
    'Sol',
    null,
    'demo',
  );
  const repository = {
    findAll: jest.fn().mockResolvedValue([client, demo]),
  } as unknown as TenantRepository;

  it('no lista demos por omisión', async () => {
    const tenants = await new ListTenantsUseCase(repository).execute();

    expect(tenants.map((tenant) => tenant.slug)).toEqual(['luna']);
  });

  it('lista las demos cuando se piden', async () => {
    const tenants = await new ListTenantsUseCase(repository).execute({
      includeDemos: true,
    });

    expect(tenants.map((tenant) => tenant.slug)).toEqual(['luna', 'demo-sol']);
  });
});
