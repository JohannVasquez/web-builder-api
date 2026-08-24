import type { Page } from './Page';

/**
 * Clase abstracta usada como token de inyección de dependencias (diod).
 * TypeScript borra las `interface` en runtime, así que el contrato de
 * repositorio necesita ser una clase abstracta para poder resolverse
 * a través del contenedor.
 */
export abstract class PageRepository {
  public abstract findBySlug(tenantId: number, slug: string): Promise<Page | null>;
}
