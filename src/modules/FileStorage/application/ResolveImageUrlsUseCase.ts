import { StorageProvider } from '../domain/StorageProvider';

/**
 * Props cuyo valor string es una `key` de archivo. `imageUrl` es el
 * contenido propio de cada sección (ej. la foto lateral de `TextBlock`);
 * `backgroundImageUrl` es el fondo del `<section>` completo, disponible en
 * cualquier tipo de sección vía `SectionBackgroundPropsSchema` (frontend).
 */
const IMAGE_KEY_PROPS = new Set(['imageUrl', 'backgroundImageUrl']);
/** Props cuyo valor es un array de `key`s (ej. `Hero.images` del carrusel). */
const IMAGE_KEY_LIST_PROPS = new Set(['images']);
const ABSOLUTE_URL_PATTERN = /^https?:\/\//;

/**
 * Recorre un `props` de `PageSection` (o cualquier JSON similar) y reemplaza
 * cada valor de una propiedad "de imagen" — `imageUrl` a cualquier
 * profundidad (incluida dentro de arrays como `Features.items[].imageUrl`),
 * y cada elemento de un array `images` (el carrusel del Hero) — por una URL
 * firmada fresca, sin que el llamador necesite conocer el schema de cada
 * tipo de sección.
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
            await this.resolveEntry(key, entryValue),
          ],
        ),
      );
      return Object.fromEntries(entries);
    }
    return value;
  }

  private async resolveEntry(key: string, value: unknown): Promise<unknown> {
    if (IMAGE_KEY_PROPS.has(key) && typeof value === 'string') {
      return this.resolveImageKey(value);
    }
    if (IMAGE_KEY_LIST_PROPS.has(key) && Array.isArray(value)) {
      // `Array.isArray` narrows `unknown` to `any[]` (a known TS lib quirk),
      // así que se retipa explícito a `unknown[]` antes de mapear.
      const items: readonly unknown[] = value;
      return Promise.all(
        items.map((item) =>
          typeof item === 'string' ? this.resolveImageKey(item) : item,
        ),
      );
    }
    return this.resolveValue(value);
  }

  private async resolveImageKey(value: string): Promise<string> {
    if (value === '' || ABSOLUTE_URL_PATTERN.test(value)) {
      return value;
    }
    return this.storageProvider.getPresignedUrl(value);
  }
}
