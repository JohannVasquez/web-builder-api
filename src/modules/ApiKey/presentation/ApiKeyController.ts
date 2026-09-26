import type { Request, Response } from 'express';
import type { CreateApiKeyUseCase } from '../application/CreateApiKeyUseCase';
import type { ListApiKeysUseCase } from '../application/ListApiKeysUseCase';
import type { RevokeApiKeyUseCase } from '../application/RevokeApiKeyUseCase';
import type { RegenerateApiKeyUseCase } from '../application/RegenerateApiKeyUseCase';
import { CreateApiKeySchema } from '../domain/ApiKeySchema';
import { getRequestActor } from './actorMiddleware';
import { ForbiddenError } from '@/shared/domain/ForbiddenError';
import { idSchema } from '@/shared/domain/identifier';

const ApiKeyIdSchema = idSchema;

export class ApiKeyController {
  constructor(
    private readonly createApiKeyUseCase: CreateApiKeyUseCase,
    private readonly listApiKeysUseCase: ListApiKeysUseCase,
    private readonly revokeApiKeyUseCase: RevokeApiKeyUseCase,
    private readonly regenerateApiKeyUseCase: RegenerateApiKeyUseCase,
  ) {}

  public readonly list = async (_req: Request, res: Response): Promise<void> => {
    res.json({ apiKeys: await this.listApiKeysUseCase.execute() });
  };

  public readonly create = async (req: Request, res: Response): Promise<void> => {
    const actor = this.requirePerson(res);
    const input = CreateApiKeySchema.parse(req.body);
    const created = await this.createApiKeyUseCase.execute(input, actor.id);
    res.status(201).json({
      ...created,
      warning: 'Guarda esta clave ahora: no se vuelve a mostrar.',
    });
  };

  public readonly revoke = async (req: Request, res: Response): Promise<void> => {
    this.requirePerson(res);
    const id = ApiKeyIdSchema.parse(req.params.apiKeyId);
    res.json({ apiKey: await this.revokeApiKeyUseCase.execute(id) });
  };

  public readonly regenerate = async (req: Request, res: Response): Promise<void> => {
    this.requirePerson(res);
    const id = ApiKeyIdSchema.parse(req.params.apiKeyId);
    const created = await this.regenerateApiKeyUseCase.execute(id);
    res.status(201).json({
      ...created,
      warning: 'Guarda esta clave ahora: no se vuelve a mostrar.',
    });
  };

  // Una clave no puede crear ni revocar claves: sería una escalada de privilegios silenciosa.
  private requirePerson(res: Response): { id: string } {
    const actor = getRequestActor(res);
    if (actor.type !== 'admin') {
      throw new ForbiddenError(
        'Las claves de acceso se gestionan desde el panel, con una sesión de persona.',
      );
    }
    return actor;
  }
}
