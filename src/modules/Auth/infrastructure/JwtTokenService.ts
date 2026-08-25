import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { TokenService, type AdminTokenPayload } from '../domain/TokenService';

const PayloadSchema = z.object({ adminUserId: z.number().int().positive() });

/**
 * Clase (no interface) para poder registrarse como token resoluble por diod
 * e inyectarse explícita en `JwtTokenService` (ver `withDependencies` en la
 * raíz de composición).
 */
export class JwtConfig {
  constructor(
    public readonly secret: string,
    public readonly expiresInSeconds: number,
  ) {}
}

export class JwtTokenService implements TokenService {
  constructor(private readonly config: JwtConfig) {}

  public sign(payload: AdminTokenPayload): string {
    return jwt.sign(payload, this.config.secret, {
      expiresIn: this.config.expiresInSeconds,
    });
  }

  public verify(token: string): AdminTokenPayload | null {
    try {
      const decoded: unknown = jwt.verify(token, this.config.secret);
      const parsed = PayloadSchema.safeParse(decoded);
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }
}
