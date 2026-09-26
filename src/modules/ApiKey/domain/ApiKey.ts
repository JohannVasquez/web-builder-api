import type { Permission } from './Actor';

export interface ApiKeyPrimitives {
  readonly id: string;
  readonly name: string;
  readonly prefix: string;
  readonly permission: Permission;
  readonly scopeAllTenants: boolean;
  readonly tenantIds: readonly string[];
  readonly rateLimitPerMinute: number;
  readonly createdById: string;
  readonly expiresAt: string | null;
  readonly lastUsedAt: string | null;
  readonly revokedAt: string | null;
  readonly createdAt: string;
  readonly status: ApiKeyStatus;
}

export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export class ApiKey {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly prefix: string,
    public readonly permission: Permission,
    public readonly scopeAllTenants: boolean,
    public readonly tenantIds: readonly string[],
    public readonly rateLimitPerMinute: number,
    public readonly createdById: string,
    public readonly expiresAt: Date | null,
    public readonly lastUsedAt: Date | null,
    public readonly revokedAt: Date | null,
    public readonly createdAt: Date,
  ) {}

  public status(now = new Date()): ApiKeyStatus {
    if (this.revokedAt !== null) {
      return 'revoked';
    }
    if (this.expiresAt !== null && this.expiresAt.getTime() <= now.getTime()) {
      return 'expired';
    }
    return 'active';
  }

  public isUsable(now = new Date()): boolean {
    return this.status(now) === 'active';
  }

  // `null` = alcanza todos los clientes; es lo que consume `Actor.tenantScope`.
  public scope(): readonly string[] | null {
    return this.scopeAllTenants ? null : this.tenantIds;
  }

  public toPrimitives(): ApiKeyPrimitives {
    return {
      id: this.id,
      name: this.name,
      prefix: this.prefix,
      permission: this.permission,
      scopeAllTenants: this.scopeAllTenants,
      tenantIds: this.tenantIds,
      rateLimitPerMinute: this.rateLimitPerMinute,
      createdById: this.createdById,
      expiresAt: this.expiresAt?.toISOString() ?? null,
      lastUsedAt: this.lastUsedAt?.toISOString() ?? null,
      revokedAt: this.revokedAt?.toISOString() ?? null,
      createdAt: this.createdAt.toISOString(),
      status: this.status(),
    };
  }
}
