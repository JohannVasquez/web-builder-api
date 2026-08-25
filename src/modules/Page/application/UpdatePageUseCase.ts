import type { Page } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';
import type { PageUpdateInput } from '../domain/PageSchema';

export class UpdatePageUseCase {
  constructor(private readonly pageRepository: PageRepository) {}

  public async execute(
    tenantId: number,
    id: number,
    input: PageUpdateInput,
  ): Promise<Page> {
    return this.pageRepository.update(tenantId, id, input);
  }
}
