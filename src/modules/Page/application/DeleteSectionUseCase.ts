import type { Page } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';

export class DeleteSectionUseCase {
  constructor(private readonly pageRepository: PageRepository) {}

  public async execute(
    tenantId: string,
    pageId: string,
    sectionId: string,
  ): Promise<Page> {
    return this.pageRepository.deleteSection(tenantId, pageId, sectionId);
  }
}
