import type { PageSnapshot } from './PageSnapshot';

export interface PageVersionActor {
  readonly type: 'admin' | 'apiKey';
  readonly id: number | null;
  readonly name: string;
}

export interface PageVersionPrimitives {
  readonly id: number;
  readonly summary: string;
  readonly actorType: string;
  readonly actorName: string;
  readonly published: boolean;
  readonly createdAt: string;
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class PageVersionRepository {
  public abstract record(
    pageId: number,
    snapshot: PageSnapshot,
    summary: string,
    actor: PageVersionActor,
  ): Promise<void>;
  public abstract list(
    tenantId: number,
    pageId: number,
    limit: number,
  ): Promise<PageVersionPrimitives[]>;
  public abstract findSnapshot(
    tenantId: number,
    pageId: number,
    versionId: number,
  ): Promise<PageSnapshot | null>;
  public abstract markPublished(pageId: number, versionId: number): Promise<void>;
}
