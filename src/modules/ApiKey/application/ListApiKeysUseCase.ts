import { ApiKeyRepository } from '../domain/ApiKeyRepository';
import type { ApiKeyPrimitives } from '../domain/ApiKey';

export class ListApiKeysUseCase {
  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  public async execute(): Promise<ApiKeyPrimitives[]> {
    const keys = await this.apiKeyRepository.findAll();
    return keys.map((key) => key.toPrimitives());
  }
}
