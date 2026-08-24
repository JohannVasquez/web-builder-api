import type { GlobalSettings } from '../domain/GlobalSettings';
import type { GlobalSettingsRepository } from '../domain/GlobalSettingsRepository';

export class GetGlobalSettingsUseCase {
  constructor(private readonly globalSettingsRepository: GlobalSettingsRepository) {}

  public async execute(tenantId: number): Promise<GlobalSettings> {
    return this.globalSettingsRepository.find(tenantId);
  }
}
