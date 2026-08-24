import type { Request, Response } from 'express';
import { getRequestTenant } from '../../Tenant/presentation/tenantResolver';
import type { GetGlobalSettingsUseCase } from '../application/GetGlobalSettingsUseCase';

export class GlobalSettingsController {
  constructor(private readonly getGlobalSettingsUseCase: GetGlobalSettingsUseCase) {}

  public readonly get = async (_req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    const settings = await this.getGlobalSettingsUseCase.execute(tenant.id);
    res.json(settings.toPrimitives());
  };
}
