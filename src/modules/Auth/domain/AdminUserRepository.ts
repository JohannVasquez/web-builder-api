import type { AdminRole, AdminUser } from './AdminUser';

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class AdminUserRepository {
  public abstract findByEmail(email: string): Promise<AdminUser | null>;
  public abstract findById(id: string): Promise<AdminUser | null>;
  public abstract findAll(): Promise<AdminUser[]>;
  public abstract create(
    email: string,
    name: string,
    passwordHash: string,
    role: AdminRole,
    tenantIds: readonly string[],
  ): Promise<AdminUser>;
  public abstract setTenants(
    id: string,
    tenantIds: readonly string[],
  ): Promise<AdminUser | null>;
  public abstract setRole(id: string, role: AdminRole): Promise<AdminUser | null>;
  public abstract setDisabled(id: string, disabled: boolean): Promise<AdminUser | null>;
  public abstract setPassword(id: string, passwordHash: string): Promise<void>;
}
