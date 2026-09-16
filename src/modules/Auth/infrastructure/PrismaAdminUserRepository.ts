import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';
import { ADMIN_ROLES, AdminUser, type AdminRole } from '../domain/AdminUser';
import type { AdminUserRepository } from '../domain/AdminUserRepository';

interface AdminUserRecord {
  readonly id: number;
  readonly email: string;
  readonly name: string;
  readonly passwordHash: string;
  readonly role: string;
  readonly disabledAt: Date | null;
}

export class PrismaAdminUserRepository implements AdminUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findByEmail(email: string): Promise<AdminUser | null> {
    const record = await this.prisma.adminUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return record === null ? null : this.toDomain(record);
  }

  public async findById(id: number): Promise<AdminUser | null> {
    const record = await this.prisma.adminUser.findUnique({ where: { id } });
    return record === null ? null : this.toDomain(record);
  }

  public async findAll(): Promise<AdminUser[]> {
    const records = await this.prisma.adminUser.findMany({ orderBy: { name: 'asc' } });
    return records.map((record) => this.toDomain(record));
  }

  public async create(
    email: string,
    name: string,
    passwordHash: string,
    role: AdminRole,
  ): Promise<AdminUser> {
    const record = await this.prisma.adminUser.create({
      data: { email: email.trim().toLowerCase(), name, passwordHash, role },
    });
    return this.toDomain(record);
  }

  public async setRole(id: number, role: AdminRole): Promise<AdminUser | null> {
    const record = await this.prisma.adminUser.update({ where: { id }, data: { role } });
    return this.toDomain(record);
  }

  public async setDisabled(id: number, disabled: boolean): Promise<AdminUser | null> {
    const record = await this.prisma.adminUser.update({
      where: { id },
      data: { disabledAt: disabled ? new Date() : null },
    });
    return this.toDomain(record);
  }

  public async setPassword(id: number, passwordHash: string): Promise<void> {
    await this.prisma.adminUser.update({ where: { id }, data: { passwordHash } });
  }

  // Un rol desconocido en la base se degrada a `editor`, nunca se asume el más amplio.
  private toRole(value: string): AdminRole {
    return (ADMIN_ROLES as readonly string[]).includes(value)
      ? (value as AdminRole)
      : 'editor';
  }

  private toDomain(record: AdminUserRecord): AdminUser {
    return new AdminUser(
      record.id,
      record.email,
      record.name,
      record.passwordHash,
      this.toRole(record.role),
      record.disabledAt,
    );
  }
}
