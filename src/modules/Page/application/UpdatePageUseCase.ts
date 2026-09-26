import { PAGE_PREFIX, RecordSlugChangeUseCase } from '@/modules/Redirect/application/RecordSlugChangeUseCase';
import type { Page } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';
import type { PageUpdateInput } from '../domain/PageSchema';
import type { StoreSettingsRepository } from '@/modules/Store/domain/StoreSettingsRepository';

export class UpdatePageUseCase {
  constructor(
    private readonly pageRepository: PageRepository,
    private readonly slugChanges: RecordSlugChangeUseCase,
    private readonly storeSettingsRepository: StoreSettingsRepository,
  ) {}

  public async execute(
    tenantId: string,
    id: string,
    input: PageUpdateInput,
  ): Promise<Page> {
    const previous = await this.pageRepository.findById(tenantId, id);
    if (previous !== null) {
      if (input.isPublished === false || (input.slug !== undefined && input.slug !== previous.slug)) {
        const settings = await this.storeSettingsRepository.find(tenantId);
        if (settings.isEnabled && settings.termsPageSlug === previous.slug) {
          throw new Error('No puedes despublicar o cambiar el enlace de la página de términos de compra mientras la tienda esté encendida.');
        }
      }
    }

    const updated = await this.pageRepository.update(tenantId, id, input);

    if (previous !== null && input.slug !== undefined && input.slug !== previous.slug) {
      await this.slugChanges.execute(tenantId, PAGE_PREFIX, previous.slug, input.slug);
    }
    return updated;
  }
}
