import type { AdminUserPrimitives } from '../domain/AdminUser';
import { AdminUserRepository } from '../domain/AdminUserRepository';
import { InvalidCredentialsError } from '../domain/InvalidCredentialsError';
import type { LoginInput } from '../domain/LoginSchema';
import { PasswordHasher } from '../domain/PasswordHasher';
import { TokenService } from '../domain/TokenService';

export interface LoginResult {
  readonly token: string;
  readonly user: AdminUserPrimitives;
}

export class LoginUseCase {
  constructor(
    private readonly adminUserRepository: AdminUserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  public async execute(input: LoginInput): Promise<LoginResult> {
    const user = await this.adminUserRepository.findByEmail(input.email);
    if (user === null) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.verify(
      input.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const token = this.tokenService.sign({ adminUserId: user.id });
    return { token, user: user.toPrimitives() };
  }
}
