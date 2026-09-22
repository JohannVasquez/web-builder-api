import { ApiKeyRepository } from '../domain/ApiKeyRepository';
import { hashApiKeyToken } from '../domain/apiKeyToken';
import type { Actor } from '../domain/Actor';
import { UnauthorizedError } from '@/shared/domain/UnauthorizedError';

export class AuthenticateApiKeyUseCase {
  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  public async execute(token: string): Promise<Actor> {
    const apiKey = await this.apiKeyRepository.findByHash(hashApiKeyToken(token));
    if (apiKey === null) {
      throw new UnauthorizedError('Clave de acceso inválida.');
    }

    const status = apiKey.status();
    if (status === 'revoked') {
      throw new UnauthorizedError(
        `La clave "${apiKey.name}" fue revocada y ya no sirve. Pide una nueva desde el panel.`,
      );
    }
    if (status === 'expired') {
      throw new UnauthorizedError(
        `La clave "${apiKey.name}" venció. Regenérala desde el panel para seguir usándola.`,
      );
    }

    // Telemetría: que falle no puede impedir una petición legítima.
    void this.apiKeyRepository.touchLastUsed(apiKey.id).catch(() => undefined);

    return {
      type: 'apiKey',
      id: apiKey.id,
      name: apiKey.name,
      role: null,
      permission: apiKey.permission,
      tenantScope: apiKey.scope(),
      rateLimitPerMinute: apiKey.rateLimitPerMinute,
    };
  }
}
