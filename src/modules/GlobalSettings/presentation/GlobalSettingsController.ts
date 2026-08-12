import type { Request, Response } from 'express';
import type { GetGlobalSettingsUseCase } from '../application/GetGlobalSettingsUseCase';

export class GlobalSettingsController {
  constructor(private readonly getGlobalSettingsUseCase: GetGlobalSettingsUseCase) {}

  public readonly get = async (_req: Request, res: Response): Promise<void> => {
    const settings = await this.getGlobalSettingsUseCase.execute();
    res.json(settings.toPrimitives());
  };
}
