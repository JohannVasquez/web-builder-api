import { AuthenticateApiKeyUseCase } from './AuthenticateApiKeyUseCase';
import { ApiKey } from '../domain/ApiKey';
import { ApiKeyRepository } from '../domain/ApiKeyRepository';
import { UnauthorizedError } from '../../../shared/domain/UnauthorizedError';

describe('AuthenticateApiKeyUseCase', () => {
  const buildApiKey = (
    overrides: { revokedAt?: Date | null; expiresAt?: Date | null } = {},
  ): ApiKey =>
    new ApiKey(
      1,
      'Agente MCP',
      'abcdef',
      'write',
      true,
      [],
      120,
      1,
      overrides.expiresAt ?? null,
      null,
      overrides.revokedAt ?? null,
      new Date('2024-01-01T00:00:00.000Z'),
    );

  const buildRepository = (): jest.Mocked<ApiKeyRepository> => ({
    create: jest.fn(),
    findByHash: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    revoke: jest.fn(),
    touchLastUsed: jest.fn().mockResolvedValue(undefined),
  });

  it('rejects an unknown token', async () => {
    const repository = buildRepository();
    repository.findByHash.mockResolvedValue(null);
    const useCase = new AuthenticateApiKeyUseCase(repository);

    await expect(useCase.execute('wb_unknown')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a revoked key, naming it in the message', async () => {
    const repository = buildRepository();
    repository.findByHash.mockResolvedValue(buildApiKey({ revokedAt: new Date() }));
    const useCase = new AuthenticateApiKeyUseCase(repository);

    await expect(useCase.execute('wb_token')).rejects.toThrow(/Agente MCP.*revocada/);
  });

  it('rejects an expired key, mentioning it expired', async () => {
    const repository = buildRepository();
    repository.findByHash.mockResolvedValue(
      buildApiKey({ expiresAt: new Date('2020-01-01T00:00:00.000Z') }),
    );
    const useCase = new AuthenticateApiKeyUseCase(repository);

    await expect(useCase.execute('wb_token')).rejects.toThrow(/venció/);
  });

  it('resolves a valid key into an apiKey actor with its permission, scope and rate limit', async () => {
    const repository = buildRepository();
    repository.findByHash.mockResolvedValue(buildApiKey());
    const useCase = new AuthenticateApiKeyUseCase(repository);

    const actor = await useCase.execute('wb_token');

    expect(actor).toEqual({
      type: 'apiKey',
      id: 1,
      name: 'Agente MCP',
      role: null,
      permission: 'write',
      tenantScope: null,
      rateLimitPerMinute: 120,
    });
  });

  it('touches lastUsedAt on success', async () => {
    const repository = buildRepository();
    repository.findByHash.mockResolvedValue(buildApiKey());
    const useCase = new AuthenticateApiKeyUseCase(repository);

    await useCase.execute('wb_token');

    expect(repository.touchLastUsed).toHaveBeenCalledWith(1);
  });

  it('still authenticates when touching lastUsedAt fails', async () => {
    const repository = buildRepository();
    repository.findByHash.mockResolvedValue(buildApiKey());
    repository.touchLastUsed.mockRejectedValue(new Error('db down'));
    const useCase = new AuthenticateApiKeyUseCase(repository);

    await expect(useCase.execute('wb_token')).resolves.toMatchObject({ type: 'apiKey' });
  });
});
