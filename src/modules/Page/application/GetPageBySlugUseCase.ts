import type { Page } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';
import { PageNotFoundError } from '../domain/PageNotFoundError';

export class GetPageBySlugUseCase {
  constructor(private readonly pageRepository: PageRepository) {}

  public async execute(slug: string): Promise<Page> {
    const page = await this.pageRepository.findBySlug(slug);
    if (page === null) {
      throw new PageNotFoundError(slug);
    }
    return page;
  }
}
