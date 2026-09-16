import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestTenant } from '../../Tenant/presentation/tenantResolver';
import type { ListBlogPostsUseCase } from '../application/ListBlogPostsUseCase';
import type { GetBlogPostUseCase } from '../application/GetBlogPostUseCase';

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(10),
  tag: z.string().max(100).optional(),
});

const SlugSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Dirección de publicación inválida');

export class BlogController {
  constructor(
    private readonly listBlogPostsUseCase: ListBlogPostsUseCase,
    private readonly getBlogPostUseCase: GetBlogPostUseCase,
  ) {}

  public readonly list = async (req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    const { page, perPage, tag } = ListQuerySchema.parse(req.query);
    res.json(await this.listBlogPostsUseCase.execute(tenant.id, page, perPage, tag));
  };

  public readonly get = async (req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    const slug = SlugSchema.parse(req.params.slug);
    res.json({ post: await this.getBlogPostUseCase.execute(tenant.id, slug) });
  };
}
