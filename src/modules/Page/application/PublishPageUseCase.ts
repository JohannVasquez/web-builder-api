import { PageRepository } from '../domain/PageRepository';
import {
  PageVersionRepository,
  type PageVersionActor,
} from '../domain/PageVersionRepository';
import { snapshotOf } from '../domain/PageSnapshot';
import type { Page } from '../domain/Page';

export class PublishPageUseCase {
  constructor(
    private readonly pageRepository: PageRepository,
    private readonly versionRepository: PageVersionRepository,
  ) {}

  public async execute(
    tenantId: number,
    pageId: number,
    actor: PageVersionActor,
  ): Promise<Page> {
    const published = await this.pageRepository.publish(tenantId, pageId);
    await this.versionRepository.record(
      pageId,
      snapshotOf(published),
      'Publicó la página',
      actor,
    );
    return published;
  }
}
