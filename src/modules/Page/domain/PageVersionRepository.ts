import type { PageSnapshot } from './PageSnapshot';

export interface PageVersionActor {
  readonly type: 'admin' | 'apiKey';
  readonly id: string | null;
  readonly name: string;
}

export interface PageVersionPrimitives {
  readonly id: string;
  readonly summary: string;
  readonly actorType: string;
  readonly actorName: string;
  readonly published: boolean;
  readonly createdAt: string;
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class PageVersionRepository {
  public abstract record(
    pageId: string,
    snapshot: PageSnapshot,
    summary: string,
    actor: PageVersionActor,
  ): Promise<void>;
  public abstract list(
    tenantId: string,
    pageId: string,
    limit: number,
  ): Promise<PageVersionPrimitives[]>;
  public abstract findSnapshot(
    tenantId: string,
    pageId: string,
    versionId: string,
  ): Promise<PageSnapshot | null>;
  public abstract markPublished(pageId: string, versionId: string): Promise<void>;
}
