import type { Request, Response } from 'express';
import type { ListTenantsUseCase } from '../application/ListTenantsUseCase';
import type { CreateTenantUseCase } from '../application/CreateTenantUseCase';
import type { ListSiteTemplatesUseCase } from '../application/ListSiteTemplatesUseCase';
import { CreateTenantSchema } from '../domain/TenantSchema';

export class AdminTenantController {
  constructor(
    private readonly listTenantsUseCase: ListTenantsUseCase,
    private readonly createTenantUseCase: CreateTenantUseCase,
    private readonly listSiteTemplatesUseCase: ListSiteTemplatesUseCase,
  ) {}

  public readonly list = async (_req: Request, res: Response): Promise<void> => {
    const tenants = await this.listTenantsUseCase.execute();
    res.status(200).json({ tenants: tenants.map((tenant) => tenant.toPrimitives()) });
  };

  public readonly create = async (req: Request, res: Response): Promise<void> => {
    const input = CreateTenantSchema.parse(req.body);
    const tenant = await this.createTenantUseCase.execute(input);
    res.status(201).json({ tenant: tenant.toPrimitives() });
  };

  public readonly listTemplates = async (_req: Request, res: Response): Promise<void> => {
    res.json({ templates: await this.listSiteTemplatesUseCase.execute() });
  };
}
