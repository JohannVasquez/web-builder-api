import type { NavigationLink } from './NavigationLink';
import type { NavigationInput } from './NavigationSchema';

/**
 * Clase abstracta usada como token de inyección de dependencias (diod).
 */
export abstract class NavigationRepository {
  public abstract findAll(tenantId: string): Promise<NavigationLink[]>;
  // Reemplaza el menú completo; las posiciones salen del orden del arreglo.
  public abstract replace(
    tenantId: string,
    input: NavigationInput,
  ): Promise<NavigationLink[]>;
}
