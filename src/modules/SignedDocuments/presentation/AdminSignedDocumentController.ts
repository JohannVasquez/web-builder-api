import type { Request, Response } from 'express';
import { z } from 'zod';
import { RegisterSignatureUseCase } from '../application/RegisterSignatureUseCase';
import { QuerySignaturesUseCase } from '../application/QuerySignaturesUseCase';
import { getRequestActor } from '@/modules/ApiKey/presentation/actorMiddleware';

const RegisterSignatureSchema = z.strictObject({
  tenantId: z.string().uuid(),
  document: z.string().min(1),
  version: z.string().min(1),
  signedBy: z.string().min(1),
});

const QueryNotOnVersionSchema = z.strictObject({
  document: z.string().min(1),
  currentVersion: z.string().min(1),
});

export class AdminSignedDocumentController {
  constructor(
    private readonly registerUseCase: RegisterSignatureUseCase,
    private readonly queryUseCase: QuerySignaturesUseCase,
  ) {}

  public readonly register = async (req: Request, res: Response): Promise<void> => {
    const input = RegisterSignatureSchema.parse(req.body);
    const actor = getRequestActor(res);
    const signature = await this.registerUseCase.execute(
      input.tenantId,
      input.document,
      input.version,
      input.signedBy,
      actor.id,
    );
    res.status(201).json(signature);
  };

  public readonly listByTenant = async (req: Request, res: Response): Promise<void> => {
    const { tenantId } = req.params;
    const signatures = await this.queryUseCase.forTenant(tenantId as string);
    res.status(200).json(signatures);
  };

  public readonly listOutdated = async (req: Request, res: Response): Promise<void> => {
    const input = QueryNotOnVersionSchema.parse(req.query);
    const tenantIds = await this.queryUseCase.tenantsNotOnVersion(input.document, input.currentVersion);
    res.status(200).json(tenantIds);
  };
}
