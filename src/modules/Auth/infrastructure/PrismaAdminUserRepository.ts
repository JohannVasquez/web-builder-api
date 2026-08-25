import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';
import { AdminUser } from '../domain/AdminUser';
import type { AdminUserRepository } from '../domain/AdminUserRepository';

export class PrismaAdminUserRepository implements AdminUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findByEmail(email: string): Promise<AdminUser | null> {
    const record = await this.prisma.adminUser.findUnique({ where: { email } });
    return record === null ? null : this.toDomain(record);
  }

  public async findById(id: number): Promise<AdminUser | null> {
    const record = await this.prisma.adminUser.findUnique({ where: { id } });
    return record === null ? null : this.toDomain(record);
  }

  private toDomain(record: {
    id: number;
    email: string;
    name: string;
    passwordHash: string;
  }): AdminUser {
    return new AdminUser(record.id, record.email, record.name, record.passwordHash);
  }
}
