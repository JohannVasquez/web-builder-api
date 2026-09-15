import type { SiteCacheInvalidator } from '../domain/SiteCacheInvalidator';

// Hace explícito que "no invalidar" es configuración y no un olvido.
export class NoopSiteCacheInvalidator implements SiteCacheInvalidator {
  public invalidate(): Promise<void> {
    return Promise.resolve();
  }
}
