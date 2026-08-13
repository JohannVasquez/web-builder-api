import type { Request, Response } from 'express';
import type { GetNavigationUseCase } from '../application/GetNavigationUseCase';

export class NavigationController {
  constructor(private readonly getNavigationUseCase: GetNavigationUseCase) {}

  public readonly get = async (_req: Request, res: Response): Promise<void> => {
    const links = await this.getNavigationUseCase.execute();
    res.json(links.map((link) => link.toPrimitives()));
  };
}
