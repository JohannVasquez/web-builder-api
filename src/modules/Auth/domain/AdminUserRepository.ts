import type { AdminUser } from './AdminUser';

/**
 * Clase abstracta usada como token de inyección de dependencias (diod).
 */
export abstract class AdminUserRepository {
  public abstract findByEmail(email: string): Promise<AdminUser | null>;
  public abstract findById(id: number): Promise<AdminUser | null>;
}
