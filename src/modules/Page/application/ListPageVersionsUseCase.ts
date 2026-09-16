import {
  PageVersionRepository,
  type PageVersionPrimitives,
} from '../domain/PageVersionRepository';

export class ListPageVersionsUseCase {
  constructor(private readonly repository: PageVersionRepository) {}

  public async execute(
    tenantId: number,
    pageId: number,
    limit: number,
  ): Promise<PageVersionPrimitives[]> {
    return this.repository.list(tenantId, pageId, limit);
  }
}
