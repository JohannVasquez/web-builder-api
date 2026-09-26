import type { ManageRedirectsUseCase } from './ManageRedirectsUseCase';

/**
 * Prefijo de la ruta pública de cada tipo de contenido. La portada es el único caso especial:
 * vive en `/`, no en `/home`.
 */
export const PAGE_PREFIX = '';
export const BLOG_PREFIX = '/blog';
export const PRODUCT_PREFIX = '/tienda';

const HOME_SLUG = 'home';

const pathFor = (prefix: string, slug: string): string =>
  prefix === PAGE_PREFIX && slug === HOME_SLUG ? '/' : `${prefix}/${slug}`;

/**
 * Deja una redirección permanente cuando cambia el slug de algo publicado. Sin ella, la URL
 * que Google indexó y la que alguien compartió pasan a 404 y se pierde el posicionamiento.
 *
 * Nunca lanza: renombrar una página no puede fallar porque la redirección no se pudo guardar.
 * El cambio de slug ya ocurrió; lo que se pierde es el atajo, no el contenido.
 */
export class RecordSlugChangeUseCase {
  constructor(private readonly redirects: ManageRedirectsUseCase) {}

  public async execute(
    tenantId: string,
    prefix: string,
    previousSlug: string,
    nextSlug: string | undefined,
  ): Promise<void> {
    if (nextSlug === undefined || nextSlug === previousSlug) {
      return;
    }

    try {
      await this.redirects.save(tenantId, {
        fromPath: pathFor(prefix, previousSlug),
        toPath: pathFor(prefix, nextSlug),
        statusCode: 301,
      });
    } catch {
      // Un ciclo o un fallo de escritura no puede deshacer el renombrado.
    }
  }
}
