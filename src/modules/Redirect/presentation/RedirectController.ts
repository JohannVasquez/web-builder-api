import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestTenant } from '@/modules/Tenant/presentation/tenantResolver';
import { idSchema } from '@/shared/domain/identifier';
import { RedirectInputSchema } from '../domain/Redirect';
import type { ManageRedirectsUseCase } from '../application/ManageRedirectsUseCase';

const ResolveQuerySchema = z.object({ path: z.string().min(1).max(512) });

export class RedirectController {
  constructor(private readonly useCase: ManageRedirectsUseCase) {}

  /**
   * Lo consulta el sitio antes de responder 404. Es público porque lo llama el frontend en
   * cada ruta que no encuentra, y no revela nada que no esté ya en la URL.
   */
  public readonly resolve = async (req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    const { path } = ResolveQuerySchema.parse(req.query);
    const redirect = await this.useCase.resolve(tenant.id, path);

    res.json({ redirect: redirect?.toPrimitives() ?? null });
  };

  public readonly list = async (req: Request, res: Response): Promise<void> => {
    const tenantId = idSchema.parse(req.params.tenantId);
    const redirects = await this.useCase.list(tenantId);
    res.json({ redirects: redirects.map((redirect) => redirect.toPrimitives()) });
  };

  public readonly create = async (req: Request, res: Response): Promise<void> => {
    const tenantId = idSchema.parse(req.params.tenantId);
    const input = RedirectInputSchema.parse(req.body);
    const saved = await this.useCase.save(tenantId, input);
    res.status(201).json({ redirect: saved.toPrimitives() });
  };

  public readonly remove = async (req: Request, res: Response): Promise<void> => {
    const tenantId = idSchema.parse(req.params.tenantId);
    const id = idSchema.parse(req.params.redirectId);
    await this.useCase.remove(tenantId, id);
    res.status(204).send();
  };
}
