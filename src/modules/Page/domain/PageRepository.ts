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
  public abstract findBySlug(tenantId: string, slug: string): Promise<Page | null>;
  // Público pero solo con enlace de revisión: lee el borrador (las filas de sections).
  public abstract findDraftBySlug(tenantId: string, slug: string): Promise<Page | null>;
  // Cuándo se publicó la versión vigente de una página; nulo si no existe o no está publicada.
  public abstract findPublishedAt(tenantId: string, slug: string): Promise<Date | null>;

  // Admin: todo scoped por `tenantId`, para que un id adivinado nunca cruce
  // hacia el sitio de otro cliente.
  public abstract findAllByTenant(tenantId: string): Promise<Page[]>;
  public abstract findById(tenantId: string, id: string): Promise<Page | null>;
  public abstract create(tenantId: string, input: PageInput): Promise<Page>;
  public abstract update(
    tenantId: string,
    id: string,
    input: PageUpdateInput,
  ): Promise<Page>;
  public abstract delete(tenantId: string, id: string): Promise<void>;
  // Copia el borrador actual a lo publicado. Devuelve la página ya publicada.
  public abstract publish(tenantId: string, id: string): Promise<Page>;
  // Reemplaza el borrador por una foto anterior, sin tocar lo publicado.
  public abstract replaceDraft(
    tenantId: string,
    id: string,
    snapshot: PageSnapshot,
  ): Promise<Page>;

  public abstract addSection(
    tenantId: string,
    pageId: string,
    input: PageSectionInput,
  ): Promise<Page>;
  public abstract updateSection(
    tenantId: string,
    pageId: string,
    sectionId: string,
    input: PageSectionUpdateInput,
  ): Promise<Page>;
  // Copia una sección justo debajo de la original, corriendo el resto una posición.
  public abstract duplicateSection(
    tenantId: string,
    pageId: string,
    sectionId: string,
  ): Promise<Page>;
  public abstract deleteSection(
    tenantId: string,
    pageId: string,
    sectionId: string,
  ): Promise<Page>;
  /** Reescribe las posiciones 1..N según el orden dado — así se reordena sin colisionar con el `@@unique([pageId, position])`. */
  public abstract reorderSections(
    tenantId: string,
    pageId: string,
    orderedSectionIds: readonly string[],
  ): Promise<Page>;
}
