import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestTenant } from '../../Tenant/presentation/tenantResolver';
import type { GetPageBySlugUseCase } from '../application/GetPageBySlugUseCase';

const slugParamsSchema = z.strictObject({
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
});

export class PageController {
  constructor(private readonly getPageBySlugUseCase: GetPageBySlugUseCase) {}

  public readonly getBySlug = async (req: Request, res: Response): Promise<void> => {
    const { slug } = slugParamsSchema.parse(req.params);
    const tenant = getRequestTenant(res);
    const page = await this.getPageBySlugUseCase.execute(tenant.id, slug);
    res.json(page.toPrimitives());
  };
}
