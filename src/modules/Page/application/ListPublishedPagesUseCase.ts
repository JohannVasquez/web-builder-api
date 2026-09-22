import type { PageRepository } from '../domain/PageRepository';

export interface PublishedPageSummary {
  readonly slug: string;
  readonly title: string;
  readonly description: string | null;
  readonly updatedAt: string | null;
}

// Alimenta el sitemap del sitio público, así que filtra las despublicadas aquí y no
// en el frontend: una página en borrador no puede aparecer en buscadores (Spec 6.1).
export class ListPublishedPagesUseCase {
  constructor(private readonly pageRepository: PageRepository) {}

  public async execute(tenantId: string): Promise<PublishedPageSummary[]> {
    const pages = await this.pageRepository.findAllByTenant(tenantId);
    return pages
      .filter((page) => page.isPublished)
      .map((page) => ({
        slug: page.slug,
        title: page.title,
        description: page.description,
        updatedAt: page.updatedAt?.toISOString() ?? null,
      }));
  }
}
