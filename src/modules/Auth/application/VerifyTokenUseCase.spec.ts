import { VerifyTokenUseCase } from './VerifyTokenUseCase';
import { AdminUser } from '../domain/AdminUser';
import type { AdminUserRepository } from '../domain/AdminUserRepository';
import type { TokenService } from '../domain/TokenService';
import { UnauthorizedError } from '../../../shared/domain/UnauthorizedError';

describe('VerifyTokenUseCase', () => {
  const user = new AdminUser(1, 'johann@webbuilder.co', 'Johann', 'hashed-password');

  const buildTokenService = (
    payload: { adminUserId: number } | null,
  ): jest.Mocked<TokenService> => ({
    sign: jest.fn(),
    verify: jest.fn().mockReturnValue(payload),
  });

  const buildRepository = (
    found: AdminUser | null,
  ): jest.Mocked<AdminUserRepository> => ({
    findByEmail: jest.fn(),
    findById: jest.fn().mockResolvedValue(found),
  });

  it('resolves the admin user for a valid token', async () => {
    const tokenService = buildTokenService({ adminUserId: 1 });
    const repository = buildRepository(user);
    const useCase = new VerifyTokenUseCase(tokenService, repository);

    const result = await useCase.execute('valid-token');

    expect(repository.findById).toHaveBeenCalledWith(1);
    expect(result).toBe(user);
  });

  it('throws UnauthorizedError for an invalid or expired token', async () => {
    const tokenService = buildTokenService(null);
    const useCase = new VerifyTokenUseCase(tokenService, buildRepository(user));

    await expect(useCase.execute('bad-token')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('throws UnauthorizedError when the token is valid but the user no longer exists', async () => {
    const tokenService = buildTokenService({ adminUserId: 999 });
    const repository = buildRepository(null);
    const useCase = new VerifyTokenUseCase(tokenService, repository);

    await expect(useCase.execute('stale-token')).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});
