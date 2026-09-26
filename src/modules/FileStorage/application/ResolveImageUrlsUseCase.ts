import { StorageProvider } from '../domain/StorageProvider';

const ABSOLUTE_URL_PATTERN = /^https?:\/\//;
const FILE_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/i;

/**
 * Recorre un `props` de `PageSection` (o cualquier JSON similar) y reemplaza
 * cada string que sea una `key` de bucket por una URL firmada fresca.
 * Busca a cualquier profundidad en el objeto, arreglos incluidos.
 *
 * Solo se firma lo que cumple el formato estricto de key (<uuid>.<ext>);
 * lo que ya es una URL absoluta se deja pasar.
 */
export class ResolveImageUrlsUseCase {
  constructor(private readonly storageProvider: StorageProvider) {}

  public async execute(
    props: Readonly<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> {
    return this.resolveValue(props) as Promise<Record<string, unknown>>;
  }

  private async resolveValue(value: unknown): Promise<unknown> {
    if (typeof value === 'string') {
      if (FILE_KEY_PATTERN.test(value)) {
        return this.resolveImageKey(value);
      }
      return value;
    }
    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => this.resolveValue(item)));
    }
    if (value !== null && typeof value === 'object') {
      const entries = await Promise.all(
        Object.entries(value as Record<string, unknown>).map(
          async ([key, entryValue]): Promise<[string, unknown]> => [
            key,
            await this.resolveValue(entryValue),
          ],
        ),
      );
      return Object.fromEntries(entries);
    }
    return value;
  }

  /**
   * Una `key` suelta, fuera de un `props`: la imagen para compartir de una página. Misma
   * regla que dentro de `props` — lo que ya es una URL absoluta se deja pasar.
   */
  public async signKey(key: string | null): Promise<string | null> {
    if (key === null) {
      return null;
    }
    return this.resolveImageKey(key);
  }

  private async resolveImageKey(value: string): Promise<string> {
    if (value === '' || ABSOLUTE_URL_PATTERN.test(value)) {
      return value;
    }
    return this.storageProvider.getPresignedUrl(value);
  }
}
