import type { SiteCacheInvalidator } from '../domain/SiteCacheInvalidator';

export class SiteCacheConfig {
  constructor(
    // URL del endpoint de revalidación del frontend; vacía = invalidación apagada.
    public readonly revalidateUrl: string,
    public readonly secret: string,
  ) {}
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

// Nunca lanza: si el frontend está caído se pierde la frescura, no el trabajo ya guardado.
export class HttpSiteCacheInvalidator implements SiteCacheInvalidator {
  constructor(
    private readonly config: SiteCacheConfig,
    private readonly fetchFn: FetchLike = (input, init) => fetch(input, init),
  ) {}

  public async invalidate(domains: readonly string[]): Promise<void> {
    if (this.config.revalidateUrl === '' || domains.length === 0) {
      return;
    }

    try {
      const response = await this.fetchFn(this.config.revalidateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Revalidate-Secret': this.config.secret,
        },
        body: JSON.stringify({ domains }),
      });
      if (!response.ok) {
        console.warn(
          `[SiteCache] El frontend rechazó la revalidación: HTTP ${response.status}`,
        );
      }
    } catch (error) {
      console.warn('[SiteCache] No se pudo avisar al frontend:', error);
    }
  }
}
