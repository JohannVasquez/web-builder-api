import { PageRepository } from '../domain/PageRepository';
import {
  PageVersionRepository,
  type PageVersionActor,
} from '../domain/PageVersionRepository';
import { snapshotOf } from '../domain/PageSnapshot';
import type { Page } from '../domain/Page';
import { NotFoundError } from '@/shared/domain/NotFoundError';

export class RestorePageVersionUseCase {
  constructor(
    private readonly pageRepository: PageRepository,
    private readonly versionRepository: PageVersionRepository,
  ) {}

  public async execute(
    tenantId: string,
    pageId: string,
    versionId: string,
    actor: PageVersionActor,
  ): Promise<Page> {
    const snapshot = await this.versionRepository.findSnapshot(
      tenantId,
      pageId,
      versionId,
    );
    if (snapshot === null) {
      throw new NotFoundError('Esa versión no existe para esta página.');
    }

    const restored = await this.pageRepository.replaceDraft(tenantId, pageId, snapshot);

    // Restaurar crea una versión nueva en vez de borrar lo posterior: deshacer un "deshacer"
    // tiene que ser posible, o restaurar por error se vuelve irreversible.
    await this.versionRepository.record(
      pageId,
      snapshotOf(restored),
      `Restauró la versión #${String(versionId)}`,
      actor,
    );

    // Restaurar toca el borrador, no lo publicado: publicar sigue siendo una acción aparte.
    return restored;
  }
}
