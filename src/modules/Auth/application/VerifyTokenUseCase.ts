import type { AdminUser } from '../domain/AdminUser';
import { AdminUserRepository } from '../domain/AdminUserRepository';
import { TokenService } from '../domain/TokenService';
import { UnauthorizedError } from '@/shared/domain/UnauthorizedError';
import { AccountDisabledError } from '../domain/AccountDisabledError';

// Resuelve el `AdminUser` vigente, no solo la firma: un usuario borrado invalida su token.
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

    // Desactivar a alguien invalida sus tokens al instante, sin esperar a que expiren.
    if (user.isDisabled()) {
      throw new AccountDisabledError();
    }

    return user;
  }
}
