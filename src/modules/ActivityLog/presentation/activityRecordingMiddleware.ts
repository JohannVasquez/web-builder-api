import { isUuid } from '@/shared/domain/identifier';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { RecordActivityUseCase } from '../application/RecordActivityUseCase';
import { getRequestActor } from '@/modules/ApiKey/presentation/actorMiddleware';
import type { Actor } from '@/modules/ApiKey/domain/Actor';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const describe = (
  method: string,
  path: string,
): { action: string; entityType: string } => {
  const verb = path.includes('/verificar') ? 'verify' : method === 'POST' ? 'create' : method === 'DELETE' ? 'delete' : 'update';
  const entity = path.includes('/sections')
    ? 'section'
    : path.includes('/pages')
      ? 'page'
      : path.includes('/brand')
        ? 'brand'
        : path.includes('/navigation')
          ? 'navigation'
          : path.includes('/api-keys')
            ? 'apiKey'
            : path.includes('/tenants')
              ? 'tenant'
              : path.includes('/solicitudes-datos')
                ? 'dataRightsRequest'
                : 'resource';
  return { action: `${entity}.${verb}`, entityType: entity };
};

export const createActivityRecordingMiddleware = (
  recordActivityUseCase: RecordActivityUseCase,
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(req.method) && !req.originalUrl.includes('/verificar')) {
      next();
      return;
    }

    const originalUrl = req.originalUrl;
    const { action, entityType } = describe(req.method, originalUrl);

    // Cuida que el registro no guarde datos personales de más
    let body: unknown = req.body;
    if (entityType === 'dataRightsRequest' && body && typeof body === 'object') {
      const { email: _email, details: _details, ...rest } = body as Record<string, unknown>;
      body = Object.keys(rest).length > 0 ? rest : undefined;
    }

    res.on('finish', () => {
      if (res.statusCode >= 400) {
        return;
      }
      
      let actor: Actor;
      try {
        actor = getRequestActor(res);
      } catch {
        // Visitante público
        actor = { type: 'apiKey', id: '00000000-0000-0000-0000-000000000000', name: 'Público', permission: 'read', role: null, tenantScope: null, rateLimitPerMinute: null };
      }
      
      const tenantId = typeof req.params.tenantId === 'string' ? req.params.tenantId : '';

      void recordActivityUseCase.execute({
        tenantId: typeof tenantId === 'string' && isUuid(tenantId) ? tenantId : null,
        actorType: actor.type,
        actorId: actor.id === '00000000-0000-0000-0000-000000000000' ? null : actor.id,
        actorName: actor.name,
        action,
        entityType,
        entityId: entityIdOf(req),
        summary: `${req.method} ${originalUrl}`,
        after: body,
      });
    });

    next();
  };
};

const entityIdOf = (req: Request): string | null => {
  const params = req.params as Record<string, string | undefined>;
  return params.requestId ?? params.sectionId ?? params.pageId ?? params.apiKeyId ?? params.tenantId ?? null;
};
