import type { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '@/shared/domain/NotFoundError';
import { isDemoRequest, NOT_FOUND_MESSAGE } from '@/shared/presentation/demoRequest';
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

  // Una demo se sirve solo si la guarda de demos ya validó el enlace. Si una ruta llegara aquí
  // sin pasar por ella, la respuesta sigue siendo el 404 de algo que no existe: nunca el 503,
  // que diría el nombre del negocio.
  if (tenant.isDemo()) {
    if (isDemoRequest(res)) {
      next();
      return;
    }
    throw new NotFoundError(NOT_FOUND_MESSAGE);
  }

  res.status(503).json({
    error: 'SitePaused',
    status: tenant.status,
    siteName: tenant.name,
    message: TENANT_STATUS_MESSAGES[tenant.status],
  });
};
