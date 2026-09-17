import type { StoreSettings, StoreSettingsUpdate } from './StoreSettings';

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class StoreSettingsRepository {
  // Nunca devuelve `null`: un cliente sin fila tiene la tienda apagada.
  public abstract find(tenantId: number): Promise<StoreSettings>;
  public abstract save(
    tenantId: number,
    update: StoreSettingsUpdate,
  ): Promise<StoreSettings>;
}
