import { ApiKeyRepository } from '../domain/ApiKeyRepository';
import type { ApiKeyPrimitives } from '../domain/ApiKey';
import { NotFoundError } from '../../../shared/domain/NotFoundError';

export class RevokeApiKeyUseCase {
  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  public async execute(id: number): Promise<ApiKeyPrimitives> {
    const revoked = await this.apiKeyRepository.revoke(id);
    if (revoked === null) {
      throw new NotFoundError(`No existe una clave de acceso con id ${id}.`);
    }
    return revoked.toPrimitives();
  }
}
