export interface PasswordResetTicket {
  readonly id: number;
  readonly adminUserId: number;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class PasswordResetRepository {
  public abstract create(
    adminUserId: number,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  public abstract findByTokenHash(tokenHash: string): Promise<PasswordResetTicket | null>;
  public abstract markUsed(id: number): Promise<void>;
  // Al pedir uno nuevo se invalidan los anteriores: dos enlaces vivos a la vez
  // multiplican la ventana en que un correo filtrado sigue sirviendo.
  public abstract invalidateAllFor(adminUserId: number): Promise<void>;
}
