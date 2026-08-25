import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AdminUserPrimitives } from '../domain/AdminUser';
import type { VerifyTokenUseCase } from '../application/VerifyTokenUseCase';
import { UnauthorizedError } from '../../../shared/domain/UnauthorizedError';

const BEARER_PREFIX = 'Bearer ';

/**
 * Protege las rutas `/api/admin/**`: exige `Authorization: Bearer <token>`,
 * lo verifica contra `VerifyTokenUseCase`, y deja al usuario en
 * `res.locals` para los controllers — mismo patrón que `tenantResolver`.
 */
export const createAdminAuthMiddleware = (
  verifyTokenUseCase: VerifyTokenUseCase,
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization;
    if (header === undefined || !header.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedError('Falta el token de autenticación');
    }

    const token = header.slice(BEARER_PREFIX.length);
    const user = await verifyTokenUseCase.execute(token);
    (res.locals as { adminUser?: AdminUserPrimitives }).adminUser = user.toPrimitives();
    next();
  };
};

/**
 * Acceso tipado al admin autenticado. Falla ruidosamente si una ruta admin
 * se montó sin `createAdminAuthMiddleware`.
 */
export const getRequestAdminUser = (res: Response): AdminUserPrimitives => {
  const adminUser = (res.locals as { adminUser?: AdminUserPrimitives }).adminUser;
  if (adminUser === undefined) {
    throw new Error(
      'Admin no autenticado: monta createAdminAuthMiddleware antes de este controller',
    );
  }
  return adminUser;
};
