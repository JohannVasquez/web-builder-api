import type { AdminUserRepository } from '../domain/AdminUserRepository';
import type { PasswordResetMailer } from '../domain/PasswordResetMailer';
import type { PasswordResetRepository } from '../domain/PasswordResetRepository';
import { generateResetToken, hashResetToken } from '../domain/resetToken';

const TTL_MS = 60 * 60 * 1000;

export class PasswordResetConfig {
  constructor(public readonly panelUrl: string) {}
}

export class RequestPasswordResetUseCase {
  constructor(
    private readonly adminUserRepository: AdminUserRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly mailer: PasswordResetMailer,
    private readonly config: PasswordResetConfig,
  ) {}

  // No devuelve nada ni lanza si el correo no existe: el endpoint responde siempre
  // igual, para que no sirva de lista de qué correos tienen cuenta.
  public async execute(email: string): Promise<void> {
    const user = await this.adminUserRepository.findByEmail(email.trim().toLowerCase());
    if (user === null || user.isDisabled()) {
      return;
    }

    const token = await this.issue(user.id);
    await this.mailer.sendResetLink(user.email, user.name, this.buildUrl(token));
  }

  public async issue(adminUserId: number): Promise<string> {
    await this.passwordResetRepository.invalidateAllFor(adminUserId);
    const token = generateResetToken();
    await this.passwordResetRepository.create(
      adminUserId,
      hashResetToken(token),
      new Date(Date.now() + TTL_MS),
    );
    return token;
  }

  public buildUrl(token: string): string {
    return `${this.config.panelUrl.replace(/\/+$/, '')}/reset-password?token=${token}`;
  }
}
