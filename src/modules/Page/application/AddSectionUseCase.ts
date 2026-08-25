import type { Page } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';
import type { PageSectionInput } from '../domain/PageSectionSchema';

export class AddSectionUseCase {
  constructor(private readonly pageRepository: PageRepository) {}

  public async execute(
    tenantId: number,
    pageId: number,
    input: PageSectionInput,
  ): Promise<Page> {
    return this.pageRepository.addSection(tenantId, pageId, input);
  }
}
