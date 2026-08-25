/**
 * Clase abstracta usada como token de inyección de dependencias (diod).
 */
export abstract class PasswordHasher {
  public abstract hash(plainPassword: string): Promise<string>;
  public abstract verify(plainPassword: string, storedHash: string): Promise<boolean>;
}
