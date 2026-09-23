import { parseId } from '@/shared/domain/identifier';
import type { Request, Response } from 'express';
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

  private tenantIdOf(req: Request): string {
    return parseId(req.params.tenantId, 'tenantId');
  }
}
