import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import { ApiKey } from '../domain/ApiKey';
import type { ApiKeyRepository, CreateApiKeyData } from '../domain/ApiKeyRepository';
import { PERMISSIONS, type Permission } from '../domain/Actor';

interface ApiKeyRecord {
  readonly id: string;
  readonly name: string;
  readonly prefix: string;
  readonly permission: string;
  readonly scopeAllTenants: boolean;
  readonly rateLimitPerMinute: number;
  readonly createdById: string;
  readonly expiresAt: Date | null;
  readonly lastUsedAt: Date | null;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
  readonly tenants: readonly { readonly tenantId: string }[];
}

export class PrismaApiKeyRepository implements ApiKeyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(data: CreateApiKeyData): Promise<ApiKey> {
    const record = await this.prisma.apiKey.create({
      data: {
        name: data.name,
        prefix: data.prefix,
        keyHash: data.keyHash,
        permission: data.permission,
        scopeAllTenants: data.scopeAllTenants,
        rateLimitPerMinute: data.rateLimitPerMinute,
        createdById: data.createdById,
        expiresAt: data.expiresAt,
        tenants: {
          create: data.tenantIds.map((tenantId) => ({ tenantId })),
        },
      },
      include: { tenants: { select: { tenantId: true } } },
    });
    return this.toDomain(record);
  }

  public async findByHash(keyHash: string): Promise<ApiKey | null> {
    const record = await this.prisma.apiKey.findFirst({
      where: { keyHash },
      include: { tenants: { select: { tenantId: true } } },
    });
    return record === null ? null : this.toDomain(record);
  }

  public async findById(id: string): Promise<ApiKey | null> {
    const record = await this.prisma.apiKey.findUnique({
      where: { id },
      include: { tenants: { select: { tenantId: true } } },
    });
    return record === null ? null : this.toDomain(record);
  }

  public async findAll(): Promise<ApiKey[]> {
    const records = await this.prisma.apiKey.findMany({
      include: { tenants: { select: { tenantId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  public async revoke(id: string): Promise<ApiKey | null> {
    const existing = await this.findById(id);
    if (existing === null) {
      return null;
    }
    const record = await this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: existing.revokedAt ?? new Date() },
      include: { tenants: { select: { tenantId: true } } },
    });
    return this.toDomain(record);
  }

  // No espera a que termine quien la llama: es telemetría, no parte de la autorización.
  public async touchLastUsed(id: string): Promise<void> {
    await this.prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } });
  }

  private toDomain(record: ApiKeyRecord): ApiKey {
    return new ApiKey(
      record.id,
      record.name,
      record.prefix,
      this.toPermission(record.permission),
      record.scopeAllTenants,
      record.tenants.map((tenant) => tenant.tenantId),
      record.rateLimitPerMinute,
      record.createdById,
      record.expiresAt,
      record.lastUsedAt,
      record.revokedAt,
      record.createdAt,
    );
  }

  // Un permiso desconocido en la base se degrada a `read`, nunca se asume el más amplio.
  private toPermission(value: string): Permission {
    return (PERMISSIONS as readonly string[]).includes(value)
      ? (value as Permission)
      : 'read';
  }
}
