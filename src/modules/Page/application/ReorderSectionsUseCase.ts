import type { Page } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';

export class ReorderSectionsUseCase {
  constructor(private readonly pageRepository: PageRepository) {}

  public async execute(
    tenantId: number,
    pageId: number,
    orderedSectionIds: readonly number[],
  ): Promise<Page> {
    return this.pageRepository.reorderSections(tenantId, pageId, orderedSectionIds);
  }
}
