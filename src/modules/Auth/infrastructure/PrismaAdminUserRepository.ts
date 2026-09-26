import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { ADMIN_ROLES, AdminUser, type AdminRole } from '../domain/AdminUser';
import type { AdminUserRepository } from '../domain/AdminUserRepository';

interface AdminUserRecord {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly passwordHash: string;
  readonly role: string;
  readonly disabledAt: Date | null;
  readonly tenants?: readonly { readonly tenantId: string }[];
}

const withTenants = { tenants: { select: { tenantId: true } } };

export class PrismaAdminUserRepository implements AdminUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findByEmail(email: string): Promise<AdminUser | null> {
    const record = await this.prisma.adminUser.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: withTenants,
    });
    return record === null ? null : this.toDomain(record);
  }

  public async findById(id: string): Promise<AdminUser | null> {
    const record = await this.prisma.adminUser.findUnique({
      where: { id },
      include: withTenants,
    });
    return record === null ? null : this.toDomain(record);
  }

  public async findAll(): Promise<AdminUser[]> {
    const records = await this.prisma.adminUser.findMany({
      orderBy: { name: 'asc' },
      include: withTenants,
    });
    return records.map((record) => this.toDomain(record));
  }

  public async create(
    email: string,
    name: string,
    passwordHash: string,
    role: AdminRole,
    tenantIds: readonly string[] = [],
  ): Promise<AdminUser> {
    const record = await this.prisma.adminUser.create({
      data: {
        email: email.trim().toLowerCase(),
        name,
        passwordHash,
        role,
        tenants: { create: tenantIds.map((tenantId) => ({ tenantId })) },
      },
      include: withTenants,
    });
    return this.toDomain(record);
  }

  // Se reemplaza la lista completa: "estos son sus clientes ahora", no un parche.
  public async setTenants(
    id: string,
    tenantIds: readonly string[],
  ): Promise<AdminUser | null> {
    const record = await this.prisma.$transaction(async (tx) => {
      await tx.adminUserTenant.deleteMany({ where: { adminUserId: id } });
      if (tenantIds.length > 0) {
        await tx.adminUserTenant.createMany({
          data: tenantIds.map((tenantId) => ({ adminUserId: id, tenantId })),
        });
      }
      return tx.adminUser.findUnique({ where: { id }, include: withTenants });
    });
    return record === null ? null : this.toDomain(record);
  }

  public async setRole(id: string, role: AdminRole): Promise<AdminUser | null> {
    const record = await this.prisma.adminUser.update({
      where: { id },
      data: { role },
      include: withTenants,
    });
    return this.toDomain(record);
  }

  public async setDisabled(id: string, disabled: boolean): Promise<AdminUser | null> {
    const record = await this.prisma.adminUser.update({
      where: { id },
      data: { disabledAt: disabled ? new Date() : null },
      include: withTenants,
    });
    return this.toDomain(record);
  }

  public async setPassword(id: string, passwordHash: string): Promise<void> {
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
      (record.tenants ?? []).map((link) => link.tenantId),
    );
  }
}
