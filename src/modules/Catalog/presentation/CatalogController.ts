import type { Request, Response } from 'express';
import type { GetCatalogUseCase } from '../application/GetCatalogUseCase';

export class CatalogController {
  constructor(private readonly getCatalogUseCase: GetCatalogUseCase) {}

  public readonly get = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.getCatalogUseCase.execute());
  };
}
