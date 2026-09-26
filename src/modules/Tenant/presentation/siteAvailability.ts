import type { NextFunction, Request, Response } from 'express';
import { TENANT_STATUS_MESSAGES } from '../domain/Tenant';
import { getRequestTenant } from './tenantResolver';

// Un sitio pausado o en construcción no sirve contenido, pero tampoco desaparece: responde
// 503 con el motivo, para que el frontend muestre una página de mantención con la marca
// del cliente en vez de un 404 genérico. Pausar no borra nada.
export const siteAvailability = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const tenant = getRequestTenant(res);
  if (tenant.isServable()) {
    next();
    return;
  }

  res.status(503).json({
    error: 'SitePaused',
    status: tenant.status,
    siteName: tenant.name,
    message: TENANT_STATUS_MESSAGES[tenant.status],
  });
};
