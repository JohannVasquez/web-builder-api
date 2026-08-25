import type { Request, Response } from 'express';
import { LoginSchema } from '../domain/LoginSchema';
import type { LoginUseCase } from '../application/LoginUseCase';
import { getRequestAdminUser } from './adminAuthMiddleware';

export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  public readonly login = async (req: Request, res: Response): Promise<void> => {
    const input = LoginSchema.parse(req.body);
    const result = await this.loginUseCase.execute(input);
    res.status(200).json(result);
  };

  /** Detrás de `adminAuthMiddleware`: confirma la sesión y devuelve quién es. */
  public readonly me = (_req: Request, res: Response): void => {
    res.status(200).json({ user: getRequestAdminUser(res) });
  };
}
