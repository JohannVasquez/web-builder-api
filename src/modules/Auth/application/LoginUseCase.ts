import type { AdminUserPrimitives } from '../domain/AdminUser';
import { AdminUserRepository } from '../domain/AdminUserRepository';
import { InvalidCredentialsError } from '../domain/InvalidCredentialsError';
import type { LoginInput } from '../domain/LoginSchema';
import { PasswordHasher } from '../domain/PasswordHasher';
import { TokenService } from '../domain/TokenService';
import { AccountDisabledError } from '../domain/AccountDisabledError';
import { AccountLockedError } from '../domain/AccountLockedError';
import { LoginAttempts } from './LoginAttempts';

export interface LoginResult {
  readonly token: string;
  readonly user: AdminUserPrimitives;
}

export class LoginUseCase {
  constructor(
    private readonly adminUserRepository: AdminUserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly attempts: LoginAttempts,
  ) {}

  public async execute(input: LoginInput, ip = 'desconocida'): Promise<LoginResult> {
    const email = input.email.trim().toLowerCase();

    const lock = this.attempts.check(email, ip);
    if (lock.locked) {
      throw new AccountLockedError(lock.retryAfterSeconds);
    }

    const user = await this.adminUserRepository.findByEmail(email);
    const passwordMatches =
      user !== null &&
      (await this.passwordHasher.verify(input.password, user.passwordHash));

    if (user === null || !passwordMatches) {
      this.attempts.recordFailure(email, ip);
      // El mismo error para correo inexistente y contraseña mala: distinguirlos confirmaría
      // qué correos tienen cuenta.
      throw new InvalidCredentialsError();
    }

    if (user.isDisabled()) {
      throw new AccountDisabledError();
    }

    this.attempts.clear(email, ip);
    const token = this.tokenService.sign({ adminUserId: user.id });
    return { token, user: user.toPrimitives() };
  }
}
