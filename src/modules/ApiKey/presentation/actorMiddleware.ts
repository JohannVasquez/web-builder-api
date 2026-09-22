import { isUuid } from '@/shared/domain/identifier';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { VerifyTokenUseCase } from '@/modules/Auth/application/VerifyTokenUseCase';
import type { AuthenticateApiKeyUseCase } from '../application/AuthenticateApiKeyUseCase';
import type { RateLimiter } from '../application/RateLimiter';
import {
  actorReachesTenant,
  permissionAllows,
  type Actor,
  type Permission,
} from '../domain/Actor';
import { looksLikeApiKeyToken } from '../domain/apiKeyToken';
import type { AdminRole } from '@/modules/Auth/domain/AdminUser';
import { UnauthorizedError } from '@/shared/domain/UnauthorizedError';
import { ForbiddenError } from '@/shared/domain/ForbiddenError';
import { TooManyRequestsError } from '@/shared/domain/TooManyRequestsError';

const BEARER_PREFIX = 'Bearer ';
const DEFAULT_RATE_LIMIT = 120;

// El panel y los agentes entran por las MISMAS rutas: es lo único que garantiza que un
// agente no pueda hacer algo que el panel no valida, ni al revés (Épica 10).
export const createActorMiddleware = (
  verifyTokenUseCase: VerifyTokenUseCase,
  authenticateApiKeyUseCase: AuthenticateApiKeyUseCase,
  rateLimiter: RateLimiter,
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    const raw =
      typeof apiKeyHeader === 'string' && apiKeyHeader !== ''
        ? apiKeyHeader
        : header !== undefined && header.startsWith(BEARER_PREFIX)
          ? header.slice(BEARER_PREFIX.length)
          : null;

    if (raw === null) {
      throw new UnauthorizedError(
        'Falta el token de autenticación. Usa Authorization: Bearer <token> o X-Api-Key.',
      );
    }

    const actor = looksLikeApiKeyToken(raw)
      ? await authenticateApiKeyUseCase.execute(raw)
      : await toAdminActor(verifyTokenUseCase, raw);

    if (actor.type === 'apiKey') {
      enforceRateLimit(rateLimiter, actor);
    }

    setRequestActor(res, actor);
    next();
  };
};

const toAdminActor = async (
  verifyTokenUseCase: VerifyTokenUseCase,
  token: string,
): Promise<Actor> => {
  const user = await verifyTokenUseCase.execute(token);
  // La agencia edita sin trabas; una persona de un cliente solo escribe, y solo dentro de
  // sus propios sitios (Specs 9.2 y 9.2b). Borrar exige `full`, así que no borra nada.
  return {
    type: 'admin',
    id: user.id,
    name: user.name,
    permission: user.isStaff() ? 'full' : 'write',
    role: user.role,
    tenantScope: user.tenantScope(),
    rateLimitPerMinute: null,
  };
};

const enforceRateLimit = (rateLimiter: RateLimiter, actor: Actor): void => {
  const decision = rateLimiter.check(
    `apiKey:${actor.id}`,
    actor.rateLimitPerMinute ?? DEFAULT_RATE_LIMIT,
  );
  if (!decision.allowed) {
    throw new TooManyRequestsError(
      `La clave "${actor.name}" superó su límite de peticiones por minuto. Reintenta en ${decision.retryAfterSeconds} segundos.`,
      decision.retryAfterSeconds,
    );
  }
};

export const setRequestActor = (res: Response, actor: Actor): void => {
  (res.locals as { actor?: Actor }).actor = actor;
};

export const getRequestActor = (res: Response): Actor => {
  const actor = (res.locals as { actor?: Actor }).actor;
  if (actor === undefined) {
    throw new Error(
      'Actor no resuelto: monta createActorMiddleware antes de este router',
    );
  }
  return actor;
};

// Guarda de permiso por grupo de rutas: `write` para editar, `full` para publicar y borrar.
export const requirePermission = (required: Permission): RequestHandler => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const actor = getRequestActor(res);
    if (!permissionAllows(actor.permission, required)) {
      // El mensaje lo lee una persona o lo procesa un agente: hablarle de "tu clave" a
      // quien entró con su correo solo confunde.
      throw new ForbiddenError(
        actor.type === 'apiKey'
          ? `Esta acción necesita permiso "${required}" y tu clave tiene "${actor.permission}".`
          : 'No tienes permiso para esta acción. Pídesela a quien administra tu sitio.',
      );
    }
    next();
  };
};

// Administrar personas y claves es solo del dueño: un editor entra al panel pero no puede
// darse más permisos a sí mismo ni emitir una clave con acceso total.
export const requireRole = (required: AdminRole): RequestHandler => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const actor = getRequestActor(res);
    if (actor.role !== required) {
      throw new ForbiddenError(
        `Esta acción es solo para el rol "${required}". Pídele a la persona dueña de la cuenta que la haga.`,
      );
    }
    next();
  };
};

// Dar de alta clientes, dominios y estados es trabajo de la agencia: una persona con rol
// `client` entra al panel pero no puede crearse otro sitio ni tocar el dominio del suyo.
export const requireStaff: RequestHandler = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const actor = getRequestActor(res);
  if (actor.role === 'client') {
    throw new ForbiddenError(
      'Esta acción es de la agencia. Escríbele a quien administra tu sitio.',
    );
  }
  next();
};

// Una clave de alcance limitado no puede ni ver ni tocar clientes fuera de su alcance.
export const requireTenantScope: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const tenantId = typeof req.params.tenantId === 'string' ? req.params.tenantId : '';
  if (!isUuid(tenantId)) {
    next();
    return;
  }

  const actor = getRequestActor(res);
  if (!actorReachesTenant(actor, tenantId)) {
    throw new ForbiddenError('Tu clave de acceso no alcanza a este cliente.');
  }
  next();
};

// Métodos que escriben exigen `write`; borrar exige `full` (Spec 10.4).
export const requireMethodPermission: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }
  const required: Permission = req.method === 'DELETE' ? 'full' : 'write';
  requirePermission(required)(req, res, next);
};
