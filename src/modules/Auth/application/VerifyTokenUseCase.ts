import type { AdminUser } from '../domain/AdminUser';
import { AdminUserRepository } from '../domain/AdminUserRepository';
import { TokenService } from '../domain/TokenService';
import { UnauthorizedError } from '../../../shared/domain/UnauthorizedError';

/**
 * Verifica un token Bearer y resuelve al `AdminUser` vigente — no solo la
 * firma: si el usuario fue borrado después de emitirse el token, sigue
 * fallando. Usado por el middleware que protege `/api/admin/**`.
 */
export class VerifyTokenUseCase {
  constructor(
    private readonly tokenService: TokenService,
    private readonly adminUserRepository: AdminUserRepository,
  ) {}

  public async execute(token: string): Promise<AdminUser> {
    const payload = this.tokenService.verify(token);
    if (payload === null) {
      throw new UnauthorizedError('Sesión inválida o expirada');
    }

    const user = await this.adminUserRepository.findById(payload.adminUserId);
    if (user === null) {
      throw new UnauthorizedError('Sesión inválida o expirada');
    }

    return user;
  }
}
