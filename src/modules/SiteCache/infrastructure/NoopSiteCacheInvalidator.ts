import type { SiteCacheInvalidator } from '../domain/SiteCacheInvalidator';

/**
 * Usado en tests y cuando no hay frontend configurado (`WEBAPP_REVALIDATE_URL`
 * vacía). Hace explícito que "no invalidar" es una decisión de configuración
 * y no un olvido.
 */
export class NoopSiteCacheInvalidator implements SiteCacheInvalidator {
  public invalidate(): Promise<void> {
    return Promise.resolve();
  }
}
