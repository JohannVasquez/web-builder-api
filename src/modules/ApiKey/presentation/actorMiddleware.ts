import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { VerifyTokenUseCase } from '../../Auth/application/VerifyTokenUseCase';
import type { AuthenticateApiKeyUseCase } from '../application/AuthenticateApiKeyUseCase';
import type { RateLimiter } from '../application/RateLimiter';
import {
  actorReachesTenant,
  permissionAllows,
  type Actor,
  type Permission,
} from '../domain/Actor';
import { looksLikeApiKeyToken } from '../domain/apiKeyToken';
import { UnauthorizedError } from '../../../shared/domain/UnauthorizedError';
import { ForbiddenError } from '../../../shared/domain/ForbiddenError';
import { TooManyRequestsError } from '../../../shared/domain/TooManyRequestsError';

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
  // Una persona del panel tiene permiso total; los roles finos llegan con la Spec 9.2.
  return {
    type: 'admin',
    id: user.id,
    name: user.name,
    permission: 'full',
    tenantScope: null,
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
      throw new ForbiddenError(
        `Esta acción necesita permiso "${required}" y tu clave tiene "${actor.permission}".`,
      );
    }
    next();
  };
};

// Una clave de alcance limitado no puede ni ver ni tocar clientes fuera de su alcance.
export const requireTenantScope: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const tenantId = Number(req.params.tenantId);
  if (!Number.isInteger(tenantId) || tenantId <= 0) {
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
