import { ApiKeyRepository } from '../domain/ApiKeyRepository';
import { generateApiKeyToken } from '../domain/apiKeyToken';
import type { CreatedApiKey } from './CreateApiKeyUseCase';
import { NotFoundError } from '../../../shared/domain/NotFoundError';

// Revoca la anterior y entrega una nueva con la misma configuración (Spec 10.1).
export class RegenerateApiKeyUseCase {
  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  public async execute(id: number): Promise<CreatedApiKey> {
    const existing = await this.apiKeyRepository.findById(id);
    if (existing === null) {
      throw new NotFoundError(`No existe una clave de acceso con id ${id}.`);
    }

    await this.apiKeyRepository.revoke(id);

    const generated = generateApiKeyToken();
    const created = await this.apiKeyRepository.create({
      name: existing.name,
      prefix: generated.prefix,
      keyHash: generated.hash,
      permission: existing.permission,
      scopeAllTenants: existing.scopeAllTenants,
      tenantIds: existing.tenantIds,
      rateLimitPerMinute: existing.rateLimitPerMinute,
      createdById: existing.createdById,
      expiresAt: existing.expiresAt,
    });

    return { apiKey: created.toPrimitives(), token: generated.token };
  }
}
