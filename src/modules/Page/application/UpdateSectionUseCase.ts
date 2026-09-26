import type { Page } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';
import type { PageSectionUpdateInput } from '../domain/PageSectionSchema';

export class UpdateSectionUseCase {
  constructor(private readonly pageRepository: PageRepository) {}

  public async execute(
    tenantId: string,
    pageId: string,
    sectionId: string,
    input: PageSectionUpdateInput,
  ): Promise<Page> {
    return this.pageRepository.updateSection(tenantId, pageId, sectionId, input);
  }
}
