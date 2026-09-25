import type { Request, Response } from 'express';
import { idSchema } from '@/shared/domain/identifier';
import type { GetGlobalSettingsUseCase } from '../application/GetGlobalSettingsUseCase';
import type { UpdateGlobalSettingsUseCase } from '../application/UpdateGlobalSettingsUseCase';

const TenantIdSchema = idSchema;

export class AdminGlobalSettingsController {
  constructor(
    private readonly getGlobalSettingsUseCase: GetGlobalSettingsUseCase,
    private readonly updateGlobalSettingsUseCase: UpdateGlobalSettingsUseCase,
  ) {}

  public readonly get = async (req: Request, res: Response): Promise<void> => {
    const tenantId = TenantIdSchema.parse(req.params.tenantId);
    const settings = await this.getGlobalSettingsUseCase.execute(tenantId);
    res.json(settings.toPrimitives());
  };

  public readonly update = async (req: Request, res: Response): Promise<void> => {
    const tenantId = TenantIdSchema.parse(req.params.tenantId);
    await this.updateGlobalSettingsUseCase.execute(tenantId, req.body);
    // Devuelve los valores actualizados
    const settings = await this.getGlobalSettingsUseCase.execute(tenantId);
    res.json(settings.toPrimitives());
  };
}
