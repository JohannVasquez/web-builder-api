import type { Page } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';
import type { PageInput } from '../domain/PageSchema';

export class CreatePageUseCase {
  constructor(private readonly pageRepository: PageRepository) {}

  public async execute(tenantId: number, input: PageInput): Promise<Page> {
    return this.pageRepository.create(tenantId, input);
  }
}
