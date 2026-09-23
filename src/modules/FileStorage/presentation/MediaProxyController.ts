import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestTenant } from '@/modules/Tenant/presentation/tenantResolver';
import type { ResolveMediaUseCase } from '../application/ResolveMediaUseCase';

// La clave es un uuid con extensión (ver `UploadFileUseCase`): nada de barras ni de `..`.
const KeyParamsSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+\.[a-z0-9]{2,5}$/i, 'Clave de archivo inválida'),
});

/**
 * Menos que la firma que entrega, para no llegar a redirigir a una URL ya vencida. Es el
 * mismo criterio que `/brand-asset/` en la webapp.
 */
const CACHE_SECONDS = 600;

/**
 * Dirección ESTABLE para una imagen del bucket. Existe porque las URLs firmadas caducan: si
 * se sirven directamente, `next/image` vuelve a optimizar en cada firma nueva y cualquier
 * enlace compartido queda roto al rato.
 */
export class MediaProxyController {
  constructor(private readonly resolveMedia: ResolveMediaUseCase) {}

  public readonly get = async (req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    const { key } = KeyParamsSchema.parse(req.params);

    const url = await this.resolveMedia.execute(tenant.id, key);
    if (url === null) {
      // Mismo 404 para "no existe" y "es de otro cliente": distinguirlos diría qué claves
      // existen en el bucket.
      res.status(404).send('No encontramos ese archivo');
      return;
    }

    res.set('Cache-Control', `public, max-age=${CACHE_SECONDS}`);
    res.redirect(307, url);
  };
}
