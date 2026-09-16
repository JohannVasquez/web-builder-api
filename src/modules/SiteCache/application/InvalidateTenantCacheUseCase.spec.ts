import { InvalidateTenantCacheUseCase } from './InvalidateTenantCacheUseCase';
import type { SiteCacheInvalidator } from '../domain/SiteCacheInvalidator';
import type { TenantRepository } from '../../Tenant/domain/TenantRepository';

describe('InvalidateTenantCacheUseCase', () => {
  const buildTenantRepository = (domains: string[]): jest.Mocked<TenantRepository> => ({
    findByDomain: jest.fn(),
    findBySlug: jest.fn(),
    findAll: jest.fn(),
    findDomainsByTenantId: jest.fn().mockResolvedValue(domains),
    findById: jest.fn(),
    createWithContent: jest.fn(),
    readContent: jest.fn(),
  });

  it('invalida TODOS los dominios del tenant, no solo el principal', async () => {
    const invalidator: jest.Mocked<SiteCacheInvalidator> = { invalidate: jest.fn() };
    const useCase = new InvalidateTenantCacheUseCase(
      buildTenantRepository(['acme.cl', 'acme.webbuilder.co']),
      invalidator,
    );

    await useCase.execute(7);

    expect(invalidator.invalidate).toHaveBeenCalledWith([
      'acme.cl',
      'acme.webbuilder.co',
    ]);
  });

  it('no invalida nada cuando el tenant todavía no tiene dominios', async () => {
    const invalidator: jest.Mocked<SiteCacheInvalidator> = { invalidate: jest.fn() };
    const useCase = new InvalidateTenantCacheUseCase(
      buildTenantRepository([]),
      invalidator,
    );

    await useCase.execute(7);

    expect(invalidator.invalidate).toHaveBeenCalledWith([]);
  });
});
