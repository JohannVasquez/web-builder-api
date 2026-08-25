export interface AdminTokenPayload {
  readonly adminUserId: number;
}

/**
 * Clase abstracta usada como token de inyección de dependencias (diod).
 */
export abstract class TokenService {
  public abstract sign(payload: AdminTokenPayload): string;
  /** `null` si el token es inválido, expiró, o su firma no corresponde. */
  public abstract verify(token: string): AdminTokenPayload | null;
}
