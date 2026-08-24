import type { Request, Response } from 'express';
import { getRequestTenant } from '../../Tenant/presentation/tenantResolver';
import type { GetNavigationUseCase } from '../application/GetNavigationUseCase';

export class NavigationController {
  constructor(private readonly getNavigationUseCase: GetNavigationUseCase) {}

  public readonly get = async (_req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    const links = await this.getNavigationUseCase.execute(tenant.id);
    res.json(links.map((link) => link.toPrimitives()));
  };
}
