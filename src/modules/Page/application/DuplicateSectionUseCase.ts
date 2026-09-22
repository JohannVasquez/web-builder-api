import type { Page } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';

export class DuplicateSectionUseCase {
  constructor(private readonly pageRepository: PageRepository) {}

  public async execute(
    tenantId: string,
    pageId: string,
    sectionId: string,
  ): Promise<Page> {
    return this.pageRepository.duplicateSection(tenantId, pageId, sectionId);
  }
}
