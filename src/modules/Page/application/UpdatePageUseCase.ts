import {
  PAGE_PREFIX,
  RecordSlugChangeUseCase,
} from '@/modules/Redirect/application/RecordSlugChangeUseCase';
import type { Page } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';
import type { PageUpdateInput } from '../domain/PageSchema';

export class UpdatePageUseCase {
  constructor(
    private readonly pageRepository: PageRepository,
    private readonly slugChanges: RecordSlugChangeUseCase,
  ) {}

  public async execute(
    tenantId: string,
    id: string,
    input: PageUpdateInput,
  ): Promise<Page> {
    // Se lee ANTES de actualizar: después ya no hay forma de saber cuál era el slug viejo, y
    // sin él la URL que Google indexó se queda en 404.
    const previous = await this.pageRepository.findById(tenantId, id);
    const updated = await this.pageRepository.update(tenantId, id, input);

    if (previous !== null) {
      await this.slugChanges.execute(tenantId, PAGE_PREFIX, previous.slug, input.slug);
    }
    return updated;
  }
}
