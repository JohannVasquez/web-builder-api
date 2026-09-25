import type { PageRepository } from '../domain/PageRepository';
import type { StoreSettingsRepository } from '@/modules/Store/domain/StoreSettingsRepository';

export class DeletePageUseCase {
  constructor(
    private readonly pageRepository: PageRepository,
    private readonly storeSettingsRepository: StoreSettingsRepository,
  ) {}

  public async execute(tenantId: string, id: string): Promise<void> {
    const page = await this.pageRepository.findById(tenantId, id);
    if (page !== null) {
      const settings = await this.storeSettingsRepository.find(tenantId);
      if (settings.isEnabled && settings.termsPageSlug === page.slug) {
        throw new Error('No puedes borrar la página de términos de compra mientras la tienda esté encendida. Apaga la tienda primero.');
      }
    }
    await this.pageRepository.delete(tenantId, id);
  }
}
