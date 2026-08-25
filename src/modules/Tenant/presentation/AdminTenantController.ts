import type { Request, Response } from 'express';
import type { ListTenantsUseCase } from '../application/ListTenantsUseCase';

export class AdminTenantController {
  constructor(private readonly listTenantsUseCase: ListTenantsUseCase) {}

  public readonly list = async (_req: Request, res: Response): Promise<void> => {
    const tenants = await this.listTenantsUseCase.execute();
    res.status(200).json({ tenants: tenants.map((tenant) => tenant.toPrimitives()) });
  };
}
