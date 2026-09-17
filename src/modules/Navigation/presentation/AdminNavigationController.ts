import type { Request, Response } from 'express';
import { BadRequestError } from '../../../shared/domain/BadRequestError';
import type { GetNavigationUseCase } from '../application/GetNavigationUseCase';
import type { ReplaceNavigationUseCase } from '../application/ReplaceNavigationUseCase';
import { NavigationSchema } from '../domain/NavigationSchema';

export class AdminNavigationController {
  constructor(
    private readonly getNavigationUseCase: GetNavigationUseCase,
    private readonly replaceNavigationUseCase: ReplaceNavigationUseCase,
  ) {}

  public readonly list = async (req: Request, res: Response): Promise<void> => {
    const links = await this.getNavigationUseCase.execute(this.tenantIdOf(req));
    res.json({ links: links.map((link) => link.toPrimitives()) });
  };

  public readonly replace = async (req: Request, res: Response): Promise<void> => {
    const input = NavigationSchema.parse(req.body);
    const links = await this.replaceNavigationUseCase.execute(
      this.tenantIdOf(req),
      input,
    );
    res.json({ links: links.map((link) => link.toPrimitives()) });
  };

  private tenantIdOf(req: Request): number {
    const value = Number(req.params.tenantId);
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestError('El identificador del cliente no es válido.');
    }
    return value;
  }
}
