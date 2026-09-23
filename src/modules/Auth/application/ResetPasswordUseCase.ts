import type { AdminUserRepository } from '../domain/AdminUserRepository';
import { InvalidResetTokenError } from '../domain/InvalidResetTokenError';
import type { PasswordHasher } from '../domain/PasswordHasher';
import type { PasswordResetRepository } from '../domain/PasswordResetRepository';
import { hashResetToken } from '../domain/resetToken';

export class ResetPasswordUseCase {
  constructor(
    private readonly adminUserRepository: AdminUserRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  public async execute(token: string, password: string, now = new Date()): Promise<void> {
    const ticket = await this.passwordResetRepository.findByTokenHash(
      hashResetToken(token),
    );
    if (ticket === null || ticket.usedAt !== null || ticket.expiresAt <= now) {
      throw new InvalidResetTokenError();
    }

    const user = await this.adminUserRepository.findById(ticket.adminUserId);
    if (user === null || user.isDisabled()) {
      throw new InvalidResetTokenError();
    }

    await this.adminUserRepository.setPassword(
      ticket.adminUserId,
      await this.passwordHasher.hash(password),
    );
    // Marcar usado recién al final: si guardar la contraseña falla, el enlace sigue sirviendo.
    await this.passwordResetRepository.markUsed(ticket.id);
  }
}
