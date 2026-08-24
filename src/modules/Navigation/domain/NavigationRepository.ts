import type { NavigationLink } from './NavigationLink';

/**
 * Clase abstracta usada como token de inyección de dependencias (diod).
 */
export abstract class NavigationRepository {
  public abstract findAll(tenantId: number): Promise<NavigationLink[]>;
}
