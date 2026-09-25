import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestTenant } from '@/modules/Tenant/presentation/tenantResolver';
import type { GetPageBySlugUseCase } from '../application/GetPageBySlugUseCase';
import type { ListPublishedPagesUseCase } from '../application/ListPublishedPagesUseCase';

import { isRequestPreview } from '@/modules/PreviewLink/presentation/previewMiddleware';

const slugParamsSchema = z.strictObject({
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
});

export class PageController {
  constructor(
    private readonly getPageBySlugUseCase: GetPageBySlugUseCase,
    private readonly listPublishedPagesUseCase: ListPublishedPagesUseCase,
  ) {}

  // Público: solo las publicadas, porque de aquí sale el sitemap del sitio.
  public readonly listPublished = async (_req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    res.json({ pages: await this.listPublishedPagesUseCase.execute(tenant.id) });
  };

  public readonly getBySlug = async (req: Request, res: Response): Promise<void> => {
    const { slug } = slugParamsSchema.parse(req.params);
    const tenant = getRequestTenant(res);
    const isPreview = isRequestPreview(res);
    
    const page = await this.getPageBySlugUseCase.execute(tenant.id, slug, isPreview);
    
    // Dejamos en claro a la webapp que estamos en modo vista previa si lo es
    res.json({
      ...page.toPrimitives(),
      _isPreview: isPreview, // "La respuesta tiene que permitirle a la webapp mostrar de forma inequívoca que es una vista previa"
    });
  };
}
