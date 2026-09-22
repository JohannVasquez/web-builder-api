import type { Page } from './Page';
import type { PageInput, PageUpdateInput } from './PageSchema';
import type { PageSectionInput, PageSectionUpdateInput } from './PageSectionSchema';
import type { PageSnapshot } from './PageSnapshot';

/**
 * Clase abstracta usada como token de inyección de dependencias (diod).
 * TypeScript borra las `interface` en runtime, así que el contrato de
 * repositorio necesita ser una clase abstracta para poder resolverse
 * a través del contenedor.
 */
export abstract class PageRepository {
  // Público: lee el contenido PUBLICADO, no el borrador que se está editando.
  public abstract findBySlug(tenantId: number, slug: string): Promise<Page | null>;
  // Cuándo se publicó la versión vigente de una página; nulo si no existe o no está publicada.
  public abstract findPublishedAt(tenantId: number, slug: string): Promise<Date | null>;

  // Admin: todo scoped por `tenantId`, para que un id adivinado nunca cruce
  // hacia el sitio de otro cliente.
  public abstract findAllByTenant(tenantId: number): Promise<Page[]>;
  public abstract findById(tenantId: number, id: number): Promise<Page | null>;
  public abstract create(tenantId: number, input: PageInput): Promise<Page>;
  public abstract update(
    tenantId: number,
    id: number,
    input: PageUpdateInput,
  ): Promise<Page>;
  public abstract delete(tenantId: number, id: number): Promise<void>;
  // Copia el borrador actual a lo publicado. Devuelve la página ya publicada.
  public abstract publish(tenantId: number, id: number): Promise<Page>;
  // Reemplaza el borrador por una foto anterior, sin tocar lo publicado.
  public abstract replaceDraft(
    tenantId: number,
    id: number,
    snapshot: PageSnapshot,
  ): Promise<Page>;

  public abstract addSection(
    tenantId: number,
    pageId: number,
    input: PageSectionInput,
  ): Promise<Page>;
  public abstract updateSection(
    tenantId: number,
    pageId: number,
    sectionId: number,
    input: PageSectionUpdateInput,
  ): Promise<Page>;
  // Copia una sección justo debajo de la original, corriendo el resto una posición.
  public abstract duplicateSection(
    tenantId: number,
    pageId: number,
    sectionId: number,
  ): Promise<Page>;
  public abstract deleteSection(
    tenantId: number,
    pageId: number,
    sectionId: number,
  ): Promise<Page>;
  /** Reescribe las posiciones 1..N según el orden dado — así se reordena sin colisionar con el `@@unique([pageId, position])`. */
  public abstract reorderSections(
    tenantId: number,
    pageId: number,
    orderedSectionIds: readonly number[],
  ): Promise<Page>;
}
