import {
  PageVersionRepository,
  type PageVersionPrimitives,
} from '../domain/PageVersionRepository';

export class ListPageVersionsUseCase {
  constructor(private readonly repository: PageVersionRepository) {}

  public async execute(
    tenantId: string,
    pageId: string,
    limit: number,
  ): Promise<PageVersionPrimitives[]> {
    return this.repository.list(tenantId, pageId, limit);
  }
}
