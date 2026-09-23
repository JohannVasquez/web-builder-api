import type { StoreSettings, StoreSettingsUpdate } from './StoreSettings';

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class StoreSettingsRepository {
  // Nunca devuelve `null`: un cliente sin fila tiene la tienda apagada.
  public abstract find(tenantId: string): Promise<StoreSettings>;
  public abstract save(
    tenantId: string,
    update: StoreSettingsUpdate,
  ): Promise<StoreSettings>;
}
