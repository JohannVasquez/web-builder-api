import type { Request, Response } from 'express';
import type { ManageAdminUsersUseCase } from '../application/ManageAdminUsersUseCase';
import {
  ChangeRoleSchema,
  InviteAdminUserSchema,
  SetDisabledSchema,
} from '../domain/AdminUserSchema';
import { getRequestActor } from '../../ApiKey/presentation/actorMiddleware';
import { BadRequestError } from '../../../shared/domain/BadRequestError';

export class AdminUserController {
  constructor(private readonly useCase: ManageAdminUsersUseCase) {}

  public readonly list = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({ users: await this.useCase.list() });
  };

  public readonly invite = async (req: Request, res: Response): Promise<void> => {
    const input = InviteAdminUserSchema.parse(req.body);
    res.status(201).json({ user: await this.useCase.invite(input) });
  };

  public readonly changeRole = async (req: Request, res: Response): Promise<void> => {
    const { role } = ChangeRoleSchema.parse(req.body);
    const user = await this.useCase.changeRole(
      getRequestActor(res).id,
      this.idOf(req),
      role,
    );
    res.status(200).json({ user });
  };

  public readonly setDisabled = async (req: Request, res: Response): Promise<void> => {
    const { disabled } = SetDisabledSchema.parse(req.body);
    const user = await this.useCase.setDisabled(
      getRequestActor(res).id,
      this.idOf(req),
      disabled,
    );
    res.status(200).json({ user });
  };

  private idOf(req: Request): number {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestError('El identificador de la persona no es válido.');
    }
    return id;
  }
}
