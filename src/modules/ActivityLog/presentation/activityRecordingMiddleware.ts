import { isUuid } from '@/shared/domain/identifier';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { RecordActivityUseCase } from '../application/RecordActivityUseCase';
import { getRequestActor } from '@/modules/ApiKey/presentation/actorMiddleware';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Mapea la ruta a un verbo de dominio legible; lo desconocido cae en el nombre del recurso.
const describe = (
  method: string,
  path: string,
): { action: string; entityType: string } => {
  const verb = method === 'POST' ? 'create' : method === 'DELETE' ? 'delete' : 'update';
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
              : 'resource';
  return { action: `${entity}.${verb}`, entityType: entity };
};

// Igual que la invalidación de caché: va en un middleware para que toda ruta admin nueva
// quede registrada sin que nadie tenga que acordarse, y con el mismo actor en panel y MCP.
export const createActivityRecordingMiddleware = (
  recordActivityUseCase: RecordActivityUseCase,
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    const body: unknown = req.body;
    const originalUrl = req.originalUrl;

    res.on('finish', () => {
      if (res.statusCode >= 400) {
        return;
      }
      const actor = getRequestActor(res);
      const tenantId = typeof req.params.tenantId === 'string' ? req.params.tenantId : '';
      const { action, entityType } = describe(req.method, originalUrl);

      void recordActivityUseCase.execute({
        tenantId: typeof tenantId === 'string' && isUuid(tenantId) ? tenantId : null,
        actorType: actor.type,
        actorId: actor.id,
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
  return params.sectionId ?? params.pageId ?? params.apiKeyId ?? params.tenantId ?? null;
};
