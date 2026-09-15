import { IsDomainAllowedUseCase } from './IsDomainAllowedUseCase';
import { Tenant } from '../domain/Tenant';
import type { TenantRepository } from '../domain/TenantRepository';

describe('IsDomainAllowedUseCase', () => {
  const acmeTenant = new Tenant(2, 'acme', 'Acme Estudio', 'acme.cl');

  const buildRepository = (): jest.Mocked<TenantRepository> => ({
    findByDomain: jest.fn().mockResolvedValue(null),
    findBySlug: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    findDomainsByTenantId: jest.fn().mockResolvedValue([]),
  });

  it('allows a domain registered and verified for some tenant', async () => {
    const repository = buildRepository();
    repository.findByDomain.mockResolvedValue(acmeTenant);
    const useCase = new IsDomainAllowedUseCase(repository);

    await expect(useCase.execute('acme.cl')).resolves.toBe(true);
    expect(repository.findByDomain).toHaveBeenCalledWith('acme.cl');
  });

  it('normalizes the domain before looking it up', async () => {
    const repository = buildRepository();
    repository.findByDomain.mockResolvedValue(acmeTenant);
    const useCase = new IsDomainAllowedUseCase(repository);

    await useCase.execute('ACME.CL:443');

    expect(repository.findByDomain).toHaveBeenCalledWith('acme.cl');
  });

  it('denies an unknown domain instead of falling back to the default tenant', async () => {
    const repository = buildRepository();
    const useCase = new IsDomainAllowedUseCase(repository);

    await expect(useCase.execute('dominio-ajeno.com')).resolves.toBe(false);
    // El fallback de ResolveTenantUseCase aquí sería un agujero: emitiría
    // certificados para cualquier dominio que apunte a nuestra IP.
    expect(repository.findBySlug).not.toHaveBeenCalled();
  });

  it('denies the request when no domain is provided', async () => {
    const repository = buildRepository();
    const useCase = new IsDomainAllowedUseCase(repository);

    await expect(useCase.execute(undefined)).resolves.toBe(false);
    expect(repository.findByDomain).not.toHaveBeenCalled();
  });
});
