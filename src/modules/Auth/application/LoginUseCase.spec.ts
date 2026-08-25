import { LoginUseCase } from './LoginUseCase';
import { AdminUser } from '../domain/AdminUser';
import type { AdminUserRepository } from '../domain/AdminUserRepository';
import { InvalidCredentialsError } from '../domain/InvalidCredentialsError';
import type { PasswordHasher } from '../domain/PasswordHasher';
import type { TokenService } from '../domain/TokenService';

describe('LoginUseCase', () => {
  const user = new AdminUser(1, 'johann@webbuilder.co', 'Johann', 'hashed-password');

  const buildRepository = (
    found: AdminUser | null,
  ): jest.Mocked<AdminUserRepository> => ({
    findByEmail: jest.fn().mockResolvedValue(found),
    findById: jest.fn(),
  });

  const buildHasher = (matches: boolean): jest.Mocked<PasswordHasher> => ({
    hash: jest.fn(),
    verify: jest.fn().mockResolvedValue(matches),
  });

  const buildTokenService = (): jest.Mocked<TokenService> => ({
    sign: jest.fn().mockReturnValue('signed-token'),
    verify: jest.fn(),
  });

  it('returns a token and the user primitives on valid credentials', async () => {
    const repository = buildRepository(user);
    const hasher = buildHasher(true);
    const tokenService = buildTokenService();
    const useCase = new LoginUseCase(repository, hasher, tokenService);

    const result = await useCase.execute({
      email: 'johann@webbuilder.co',
      password: 'correct-password',
    });

    expect(hasher.verify).toHaveBeenCalledWith('correct-password', 'hashed-password');
    expect(tokenService.sign).toHaveBeenCalledWith({ adminUserId: 1 });
    expect(result).toEqual({
      token: 'signed-token',
      user: { id: 1, email: 'johann@webbuilder.co', name: 'Johann' },
    });
  });

  it('throws InvalidCredentialsError when the email does not exist', async () => {
    const repository = buildRepository(null);
    const useCase = new LoginUseCase(repository, buildHasher(true), buildTokenService());

    await expect(
      useCase.execute({ email: 'nadie@webbuilder.co', password: 'x' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError when the password does not match', async () => {
    const repository = buildRepository(user);
    const useCase = new LoginUseCase(repository, buildHasher(false), buildTokenService());

    await expect(
      useCase.execute({ email: 'johann@webbuilder.co', password: 'wrong' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
