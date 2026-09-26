// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class PasswordResetMailer {
  public abstract sendResetLink(
    email: string,
    name: string,
    resetUrl: string,
  ): Promise<void>;
  public abstract sendInvitation(
    email: string,
    name: string,
    resetUrl: string,
  ): Promise<void>;
}
