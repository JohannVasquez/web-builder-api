import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';
import type {
  PasswordResetRepository,
  PasswordResetTicket,
} from '../domain/PasswordResetRepository';

export class PrismaPasswordResetRepository implements PasswordResetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(
    adminUserId: number,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.passwordReset.create({
      data: { adminUserId, tokenHash, expiresAt },
    });
  }

  public async findByTokenHash(tokenHash: string): Promise<PasswordResetTicket | null> {
    const record = await this.prisma.passwordReset.findUnique({ where: { tokenHash } });
    if (record === null) {
      return null;
    }
    return {
      id: record.id,
      adminUserId: record.adminUserId,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
    };
  }

  public async markUsed(id: number): Promise<void> {
    await this.prisma.passwordReset.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  public async invalidateAllFor(adminUserId: number): Promise<void> {
    await this.prisma.passwordReset.updateMany({
      where: { adminUserId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
