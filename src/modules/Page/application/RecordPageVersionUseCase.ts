import {
  PageVersionRepository,
  type PageVersionActor,
} from '../domain/PageVersionRepository';
import { snapshotOf } from '../domain/PageSnapshot';
import type { Page } from '../domain/Page';

// Se llama después de cada escritura del borrador. Nunca lanza: perder una entrada del
// historial es molesto, pero hacer fallar la edición que la originó es peor.
export class RecordPageVersionUseCase {
  constructor(private readonly repository: PageVersionRepository) {}

  public async execute(
    page: Page,
    summary: string,
    actor: PageVersionActor,
  ): Promise<void> {
    if (page.id === undefined) {
      return;
    }
    try {
      await this.repository.record(page.id, snapshotOf(page), summary, actor);
    } catch (error) {
      console.error('[PageVersion] No se pudo guardar la versión:', error);
    }
  }
}
