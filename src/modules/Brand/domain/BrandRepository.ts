import type { Brand, BrandUpdate } from './BrandSchema';

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class BrandRepository {
  // Devuelve la marca por defecto si el tenant todavía no tiene fila.
  public abstract find(tenantId: string): Promise<Brand>;
  public abstract update(tenantId: string, changes: BrandUpdate): Promise<Brand>;
}
