import { parseId } from '@/shared/domain/identifier';
import type { Request, Response } from 'express';
import type { ManageAdminUsersUseCase } from '../application/ManageAdminUsersUseCase';
import {
  ChangeRoleSchema,
  InviteAdminUserSchema,
  SetDisabledSchema,
} from '../domain/AdminUserSchema';
import { getRequestActor } from '@/modules/ApiKey/presentation/actorMiddleware';

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
    const { role, tenantIds } = ChangeRoleSchema.parse(req.body);
    const user = await this.useCase.changeRole(
      getRequestActor(res).id,
      this.idOf(req),
      role,
      tenantIds,
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

  private idOf(req: Request): string {
    return parseId(req.params.id, 'id');
  }
}
