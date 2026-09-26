import type { CatalogProvider } from '../domain/CatalogProvider';
import { FONT_PAIRINGS } from '@/modules/Brand/domain/fontPairings';

export class CatalogConfig {
  constructor(public readonly catalogUrl: string) {}
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const CACHE_TTL_MS = 60_000;

// El catálogo de bloques y estilos vive en el frontend, donde están los componentes: es la
// única forma de que agregar un bloque lo publique solo para el agente (Spec 10.5).
export class HttpCatalogProvider implements CatalogProvider {
  private cached: { value: unknown; expiresAt: number } | null = null;

  constructor(
    private readonly config: CatalogConfig,
    private readonly fetchFn: FetchLike = (input, init) => fetch(input, init),
  ) {}

  public async get(): Promise<unknown> {
    if (this.cached !== null && this.cached.expiresAt > Date.now()) {
      return this.cached.value;
    }

    const fromWebapp = await this.fetchFromWebapp();
    const value = {
      ...(fromWebapp ?? { blocks: [], visualStyles: [], unavailable: true }),
      fontPairings: FONT_PAIRINGS,
    };
    this.cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  }

  private async fetchFromWebapp(): Promise<Record<string, unknown> | null> {
    if (this.config.catalogUrl === '') {
      return null;
    }
    try {
      const response = await this.fetchFn(this.config.catalogUrl);
      if (!response.ok) {
        return null;
      }
      return (await response.json()) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
