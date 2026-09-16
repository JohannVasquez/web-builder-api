import type { AdminRole, AdminUser } from './AdminUser';

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class AdminUserRepository {
  public abstract findByEmail(email: string): Promise<AdminUser | null>;
  public abstract findById(id: number): Promise<AdminUser | null>;
  public abstract findAll(): Promise<AdminUser[]>;
  public abstract create(
    email: string,
    name: string,
    passwordHash: string,
    role: AdminRole,
  ): Promise<AdminUser>;
  public abstract setRole(id: number, role: AdminRole): Promise<AdminUser | null>;
  public abstract setDisabled(id: number, disabled: boolean): Promise<AdminUser | null>;
  public abstract setPassword(id: number, passwordHash: string): Promise<void>;
}
