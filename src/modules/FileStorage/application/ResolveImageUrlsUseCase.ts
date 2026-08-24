import { StorageProvider } from '../domain/StorageProvider';

const IMAGE_KEY_PROP = 'imageUrl';
const ABSOLUTE_URL_PATTERN = /^https?:\/\//;

/**
 * Recorre un `props` de `PageSection` (o cualquier JSON similar) y reemplaza
 * cada valor de la propiedad `imageUrl` — a cualquier profundidad, incluida
 * dentro de arrays como `Features.items[].imageUrl` — por una URL firmada
 * fresca, sin que el llamador necesite conocer el schema de cada tipo de
 * sección.
 *
 * Solo se firma lo que parece una `key` propia (no empieza con `http(s)://`):
 * eso deja espacio para pegar a mano una URL externa si alguna vez hiciera
 * falta, sin romper ese caso.
 */
export class ResolveImageUrlsUseCase {
  constructor(private readonly storageProvider: StorageProvider) {}

  public async execute(
    props: Readonly<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> {
    return this.resolveValue(props) as Promise<Record<string, unknown>>;
  }

  private async resolveValue(value: unknown): Promise<unknown> {
    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => this.resolveValue(item)));
    }
    if (value !== null && typeof value === 'object') {
      const entries = await Promise.all(
        Object.entries(value as Record<string, unknown>).map(
          async ([key, entryValue]): Promise<[string, unknown]> => [
            key,
            key === IMAGE_KEY_PROP && typeof entryValue === 'string'
              ? await this.resolveImageKey(entryValue)
              : await this.resolveValue(entryValue),
          ],
        ),
      );
      return Object.fromEntries(entries);
    }
    return value;
  }

  private async resolveImageKey(value: string): Promise<string> {
    if (value === '' || ABSOLUTE_URL_PATTERN.test(value)) {
      return value;
    }
    return this.storageProvider.getPresignedUrl(value);
  }
}
