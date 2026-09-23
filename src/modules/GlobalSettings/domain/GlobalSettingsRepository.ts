import type { GlobalSettings } from './GlobalSettings';

/**
 * Clase abstracta usada como token de inyección de dependencias (diod).
 */
export abstract class GlobalSettingsRepository {
  public abstract find(tenantId: string): Promise<GlobalSettings>;
}
