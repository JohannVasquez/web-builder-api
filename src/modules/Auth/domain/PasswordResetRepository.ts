export interface PasswordResetTicket {
  readonly id: string;
  readonly adminUserId: string;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class PasswordResetRepository {
  public abstract create(
    adminUserId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  public abstract findByTokenHash(tokenHash: string): Promise<PasswordResetTicket | null>;
  public abstract markUsed(id: string): Promise<void>;
  // Al pedir uno nuevo se invalidan los anteriores: dos enlaces vivos a la vez
  // multiplican la ventana en que un correo filtrado sigue sirviendo.
  public abstract invalidateAllFor(adminUserId: string): Promise<void>;
}
