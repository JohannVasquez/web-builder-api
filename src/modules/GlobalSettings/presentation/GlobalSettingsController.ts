import type { Request, Response } from 'express';
import { getRequestTenant } from '../../Tenant/presentation/tenantResolver';
import type { GetGlobalSettingsUseCase } from '../application/GetGlobalSettingsUseCase';
import type { GetBrandUseCase } from '../../Brand/application/GetBrandUseCase';
import type { ResolveBrandAssetsUseCase } from '../../Brand/application/ResolveBrandAssetsUseCase';

// Devuelve datos del negocio y marca juntos: el frontend los necesita en el mismo render.
export class GlobalSettingsController {
  constructor(
    private readonly getGlobalSettingsUseCase: GetGlobalSettingsUseCase,
    private readonly getBrandUseCase: GetBrandUseCase,
    private readonly resolveBrandAssetsUseCase: ResolveBrandAssetsUseCase,
  ) {}

  public readonly get = async (_req: Request, res: Response): Promise<void> => {
    const tenant = getRequestTenant(res);
    const [settings, brand] = await Promise.all([
      this.getGlobalSettingsUseCase.execute(tenant.id),
      this.getBrandUseCase.execute(tenant.id),
    ]);
    res.json({
      ...settings.toPrimitives(),
      brand: await this.resolveBrandAssetsUseCase.execute(brand),
    });
  };
}
