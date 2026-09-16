import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestTenant } from '../../Tenant/presentation/tenantResolver';
import type { PublicCatalogUseCase } from '../application/StoreUseCases';

const CatalogQuerySchema = z.object({
  search: z.string().max(200).optional(),
  category: z.string().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(60).default(12),
});

const FeaturedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(4),
});

const SlugSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Dirección de producto inválida');

export class StoreController {
  constructor(private readonly catalog: PublicCatalogUseCase) {}

  public readonly list = async (req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    const { search, category, page, perPage } = CatalogQuerySchema.parse(req.query);
    res.json(
      await this.catalog.list(tenant.id, {
        search,
        categorySlug: category,
        page,
        perPage,
      }),
    );
  };

  public readonly featured = async (req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    const { limit } = FeaturedQuerySchema.parse(req.query);
    res.json({ products: await this.catalog.featured(tenant.id, limit) });
  };

  public readonly get = async (req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    const slug = SlugSchema.parse(req.params.slug);
    res.json({ product: await this.catalog.get(tenant.id, slug) });
  };

  public readonly categories = async (_req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    res.json({ categories: await this.catalog.categories(tenant.id) });
  };
}
