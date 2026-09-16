import { ApiKeyRepository } from '../domain/ApiKeyRepository';
import { generateApiKeyToken } from '../domain/apiKeyToken';
import { expiryFromDays, type CreateApiKeyInput } from '../domain/ApiKeySchema';
import type { ApiKeyPrimitives } from '../domain/ApiKey';

export interface CreatedApiKey {
  readonly apiKey: ApiKeyPrimitives;
  // Única vez que la clave completa existe fuera de quien la pidió.
  readonly token: string;
}

export class CreateApiKeyUseCase {
  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  public async execute(
    input: CreateApiKeyInput,
    createdById: number,
  ): Promise<CreatedApiKey> {
    const generated = generateApiKeyToken();
    const apiKey = await this.apiKeyRepository.create({
      name: input.name,
      prefix: generated.prefix,
      keyHash: generated.hash,
      permission: input.permission,
      scopeAllTenants: input.tenantIds === null,
      tenantIds: input.tenantIds ?? [],
      rateLimitPerMinute: input.rateLimitPerMinute,
      createdById,
      expiresAt: expiryFromDays(input.expiresInDays),
    });

    return { apiKey: apiKey.toPrimitives(), token: generated.token };
  }
}
