import type { Page } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';
import { PageIdNotFoundError } from '../domain/PageIdNotFoundError';

export class GetPageByIdUseCase {
  constructor(private readonly pageRepository: PageRepository) {}

  public async execute(tenantId: number, id: number): Promise<Page> {
    const page = await this.pageRepository.findById(tenantId, id);
    if (page === null) {
      throw new PageIdNotFoundError(id);
    }
    return page;
  }
}
