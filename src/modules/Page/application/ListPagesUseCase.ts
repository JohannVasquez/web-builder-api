import type { Page } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';

export class ListPagesUseCase {
  constructor(private readonly pageRepository: PageRepository) {}

  public async execute(tenantId: string): Promise<Page[]> {
    return this.pageRepository.findAllByTenant(tenantId);
  }
}
