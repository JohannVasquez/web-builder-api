import { ResolveTenantUseCase } from './ResolveTenantUseCase';
import { Tenant } from '../domain/Tenant';
import { TenantNotFoundError } from '../domain/TenantNotFoundError';
import type { TenantRepository } from '../domain/TenantRepository';

describe('ResolveTenantUseCase', () => {
  const defaultTenant = new Tenant(1, 'default', 'Web Builder Co.', 'localhost');
  const acmeTenant = new Tenant(2, 'acme', 'Acme Estudio', 'acme.localhost');

  const buildRepository = (): jest.Mocked<TenantRepository> => ({
    findByDomain: jest.fn().mockResolvedValue(null),
    findBySlug: jest.fn().mockResolvedValue(defaultTenant),
    findAll: jest.fn().mockResolvedValue([]),
    findDomainsByTenantId: jest.fn().mockResolvedValue([]),
  });

  it('resolves the tenant registered for the given domain', async () => {
    const repository = buildRepository();
    repository.findByDomain.mockResolvedValue(acmeTenant);
    const useCase = new ResolveTenantUseCase(repository);

    const tenant = await useCase.execute('acme.localhost');

    expect(repository.findByDomain).toHaveBeenCalledWith('acme.localhost');
    expect(tenant).toBe(acmeTenant);
  });

  it('strips the port and lowercases the domain before looking it up', async () => {
    const repository = buildRepository();
    repository.findByDomain.mockResolvedValue(acmeTenant);
    const useCase = new ResolveTenantUseCase(repository);

    await useCase.execute('ACME.localhost:3000');

    expect(repository.findByDomain).toHaveBeenCalledWith('acme.localhost');
  });

  it('falls back to the default tenant when the domain is not registered', async () => {
    const repository = buildRepository();
    const useCase = new ResolveTenantUseCase(repository);

    const tenant = await useCase.execute('desconocido.com');

    expect(repository.findBySlug).toHaveBeenCalledWith('default');
    expect(tenant).toBe(defaultTenant);
  });

  it('falls back to the default tenant when no domain is provided', async () => {
    const repository = buildRepository();
    const useCase = new ResolveTenantUseCase(repository);

    const tenant = await useCase.execute(undefined);

    expect(repository.findByDomain).not.toHaveBeenCalled();
    expect(tenant).toBe(defaultTenant);
  });

  it('throws TenantNotFoundError when not even the default tenant exists', async () => {
    const repository = buildRepository();
    repository.findBySlug.mockResolvedValue(null);
    const useCase = new ResolveTenantUseCase(repository);

    await expect(useCase.execute('desconocido.com')).rejects.toThrow(TenantNotFoundError);
  });
});
