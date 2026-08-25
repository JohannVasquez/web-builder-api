import type { Page } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';

export class DeleteSectionUseCase {
  constructor(private readonly pageRepository: PageRepository) {}

  public async execute(
    tenantId: number,
    pageId: number,
    sectionId: number,
  ): Promise<Page> {
    return this.pageRepository.deleteSection(tenantId, pageId, sectionId);
  }
}
