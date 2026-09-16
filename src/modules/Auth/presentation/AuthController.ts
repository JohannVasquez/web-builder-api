import type { Request, Response } from 'express';
import { LoginSchema } from '../domain/LoginSchema';
import type { LoginUseCase } from '../application/LoginUseCase';
import { getRequestActor } from '../../ApiKey/presentation/actorMiddleware';

export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  public readonly login = async (req: Request, res: Response): Promise<void> => {
    const input = LoginSchema.parse(req.body);
    const result = await this.loginUseCase.execute(input);
    res.status(200).json(result);
  };

  // Detrás del middleware de actor: confirma la sesión (o la clave) y devuelve quién es.
  public readonly me = (_req: Request, res: Response): void => {
    const actor = getRequestActor(res);
    res.status(200).json({
      user: { id: actor.id, name: actor.name },
      actorType: actor.type,
      permission: actor.permission,
    });
  };
}
