import type { StoreSettings, StoreSettingsUpdate } from '../domain/StoreSettings';
import type { StoreSettingsRepository } from '../domain/StoreSettingsRepository';

export class ManageStoreSettingsUseCase {
  constructor(private readonly storeSettingsRepository: StoreSettingsRepository) {}

  public async find(tenantId: number): Promise<StoreSettings> {
    return this.storeSettingsRepository.find(tenantId);
  }

  public async save(
    tenantId: number,
    update: StoreSettingsUpdate,
  ): Promise<StoreSettings> {
    return this.storeSettingsRepository.save(tenantId, update);
  }
}
