import { LoginUseCase } from './LoginUseCase';
import { AdminUser } from '../domain/AdminUser';
import type { AdminUserRepository } from '../domain/AdminUserRepository';
import { InvalidCredentialsError } from '../domain/InvalidCredentialsError';
import type { PasswordHasher } from '../domain/PasswordHasher';
import type { TokenService } from '../domain/TokenService';
import { AccountDisabledError } from '../domain/AccountDisabledError';
import { AccountLockedError } from '../domain/AccountLockedError';
import { LoginAttempts } from './LoginAttempts';

describe('LoginUseCase', () => {
  const user = new AdminUser(1, 'johann@webbuilder.co', 'Johann', 'hashed-password');

  const buildRepository = (
    found: AdminUser | null,
  ): jest.Mocked<AdminUserRepository> => ({
    findByEmail: jest.fn().mockResolvedValue(found),
    findById: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    setRole: jest.fn(),
    setDisabled: jest.fn(),
    setPassword: jest.fn(),
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
    const useCase = new LoginUseCase(
      repository,
      hasher,
      tokenService,
      new LoginAttempts(),
    );

    const result = await useCase.execute({
      email: 'johann@webbuilder.co',
      password: 'correct-password',
    });

    expect(hasher.verify).toHaveBeenCalledWith('correct-password', 'hashed-password');
    expect(tokenService.sign).toHaveBeenCalledWith({ adminUserId: 1 });
    expect(result).toEqual({
      token: 'signed-token',
      user: {
        id: 1,
        email: 'johann@webbuilder.co',
        name: 'Johann',
        role: 'owner',
        disabled: false,
      },
    });
  });

  it('throws InvalidCredentialsError when the email does not exist', async () => {
    const repository = buildRepository(null);
    const useCase = new LoginUseCase(
      repository,
      buildHasher(true),
      buildTokenService(),
      new LoginAttempts(),
    );

    await expect(
      useCase.execute({ email: 'nadie@webbuilder.co', password: 'x' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError when the password does not match', async () => {
    const repository = buildRepository(user);
    const useCase = new LoginUseCase(
      repository,
      buildHasher(false),
      buildTokenService(),
      new LoginAttempts(),
    );

    await expect(
      useCase.execute({ email: 'johann@webbuilder.co', password: 'wrong' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('rejects a disabled user even with the right password', async () => {
    const disabled = new AdminUser(
      2,
      'fuera@webbuilder.co',
      'Ex empleada',
      'hashed-password',
      'editor',
      new Date('2026-01-01T00:00:00.000Z'),
    );
    const useCase = new LoginUseCase(
      buildRepository(disabled),
      buildHasher(true),
      buildTokenService(),
      new LoginAttempts(),
    );

    await expect(
      useCase.execute({ email: 'fuera@webbuilder.co', password: 'correct-password' }),
    ).rejects.toBeInstanceOf(AccountDisabledError);
  });

  it('locks the account after five failed attempts from the same ip', async () => {
    const attempts = new LoginAttempts();
    const useCase = new LoginUseCase(
      buildRepository(user),
      buildHasher(false),
      buildTokenService(),
      attempts,
    );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        useCase.execute({ email: 'johann@webbuilder.co', password: 'wrong' }, '1.2.3.4'),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    }

    await expect(
      useCase.execute({ email: 'johann@webbuilder.co', password: 'wrong' }, '1.2.3.4'),
    ).rejects.toBeInstanceOf(AccountLockedError);
  });

  it('forgets the failed attempts once the user logs in', async () => {
    const attempts = new LoginAttempts();
    const repository = buildRepository(user);
    const failing = new LoginUseCase(
      repository,
      buildHasher(false),
      buildTokenService(),
      attempts,
    );
    const succeeding = new LoginUseCase(
      repository,
      buildHasher(true),
      buildTokenService(),
      attempts,
    );

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expect(
        failing.execute({ email: 'johann@webbuilder.co', password: 'wrong' }, '5.6.7.8'),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    }

    await succeeding.execute(
      { email: 'johann@webbuilder.co', password: 'correct-password' },
      '5.6.7.8',
    );

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expect(
        failing.execute({ email: 'johann@webbuilder.co', password: 'wrong' }, '5.6.7.8'),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    }
  });

  it('normalises the email before looking the user up', async () => {
    const repository = buildRepository(user);
    const useCase = new LoginUseCase(
      repository,
      buildHasher(true),
      buildTokenService(),
      new LoginAttempts(),
    );

    await useCase.execute({
      email: '  Johann@WebBuilder.co ',
      password: 'correct-password',
    });

    expect(repository.findByEmail).toHaveBeenCalledWith('johann@webbuilder.co');
  });
});
