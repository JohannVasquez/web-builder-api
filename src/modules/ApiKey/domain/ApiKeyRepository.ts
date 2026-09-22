import type { ApiKey } from './ApiKey';
import type { Permission } from './Actor';

export interface CreateApiKeyData {
  readonly name: string;
  readonly prefix: string;
  readonly keyHash: string;
  readonly permission: Permission;
  readonly scopeAllTenants: boolean;
  readonly tenantIds: readonly string[];
  readonly rateLimitPerMinute: number;
  readonly createdById: string;
  readonly expiresAt: Date | null;
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class ApiKeyRepository {
  public abstract create(data: CreateApiKeyData): Promise<ApiKey>;
  public abstract findByHash(keyHash: string): Promise<ApiKey | null>;
  public abstract findById(id: string): Promise<ApiKey | null>;
  public abstract findAll(): Promise<ApiKey[]>;
  public abstract revoke(id: string): Promise<ApiKey | null>;
  public abstract touchLastUsed(id: string): Promise<void>;
}
