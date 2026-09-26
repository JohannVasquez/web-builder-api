import type { ResolveImageUrlsUseCase } from '@/modules/FileStorage/application/ResolveImageUrlsUseCase';
import { Page, PageSection } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';
import { PageNotFoundError } from '../domain/PageNotFoundError';

export class GetPageBySlugUseCase {
  constructor(
    private readonly pageRepository: PageRepository,
    private readonly resolveImageUrlsUseCase: ResolveImageUrlsUseCase,
  ) {}

  public async execute(tenantId: string, slug: string, isPreview: boolean = false): Promise<Page> {
    const page = isPreview
      ? await this.pageRepository.findDraftBySlug(tenantId, slug)
      : await this.pageRepository.findBySlug(tenantId, slug);
      
    if (page === null) {
      throw new PageNotFoundError(slug);
    }

    // Cada `imageUrl` en `props` es una `key` del bucket, no una URL: se
    // firma recién aquí, en cada lectura, para que nunca quede una URL
    // firmada (de vida corta) guardada en la base de datos (AC del cliente:
    // "siempre" presigned, nunca una URL fija).
    // Un bloque oculto se descarta antes de firmar: no se muestra y firmar sus imágenes
    // solo gastaría llamadas al bucket.
    const sections = await Promise.all(
      page.sections
        .filter((section) => !section.isHidden)
        .map(
          async (section) =>
            new PageSection(
              section.type,
              section.position,
              await this.resolveImageUrlsUseCase.execute(section.props),
              section.anchor,
            ),
        ),
    );

    return new Page(
      page.slug,
      page.title,
      page.description,
      sections,
      undefined,
      true,
      null,
      page.visualStyle,
      // La imagen para compartir se firma aquí por la misma razón que las de `props`: en la
      // base solo vive la `key`, y una URL firmada caduca.
      {
        ...page.seo,
        ogImage: await this.resolveImageUrlsUseCase.signKey(page.seo.ogImage),
        noindex: isPreview || page.seo.noindex,
      },
    );
  }
}
