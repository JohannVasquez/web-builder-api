import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ResolveTenantUseCase } from '../application/ResolveTenantUseCase';
import type { Tenant } from '../domain/Tenant';

export const TENANT_DOMAIN_HEADER = 'x-tenant-domain';

/**
 * Middleware que resuelve el tenant de la petición y lo deja en `res.locals`
 * para los controllers de los módulos multi-tenant. Se monta solo en las
 * rutas scoped por tenant.
 *
 * Hay dos formas de llegar a la API y cada una trae el dominio por una vía:
 *
 * 1. Los server components de Next llaman a la API directamente, así que su
 *    `Host` es el de la API y no sirve: mandan el dominio del visitante en
 *    `X-Tenant-Domain`.
 * 2. El navegador llama a `/api/...` bajo el mismo host que la web (Caddy
 *    enruta ambos), así que no manda ningún header especial pero su `Host`
 *    ya *es* el dominio del tenant.
 *
 * Por eso el header manda cuando está y el `Host` es el respaldo: sin este
 * fallback, toda llamada desde el navegador caería al tenant por defecto.
 */
export const createTenantResolver = (
  resolveTenantUseCase: ResolveTenantUseCase,
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers[TENANT_DOMAIN_HEADER];
    const explicitDomain = Array.isArray(header) ? header[0] : header;
    const tenant = await resolveTenantUseCase.execute(explicitDomain ?? req.headers.host);
    (res.locals as { tenant?: Tenant }).tenant = tenant;
    next();
  };
};

/**
 * Acceso tipado al tenant resuelto por el middleware. Falla ruidosamente
 * si un router scoped por tenant se montó sin el resolver.
 */
export const getRequestTenant = (res: Response): Tenant => {
  const tenant = (res.locals as { tenant?: Tenant }).tenant;
  if (tenant === undefined) {
    throw new Error(
      'Tenant no resuelto: monta createTenantResolver antes de este controller',
    );
  }
  return tenant;
};
