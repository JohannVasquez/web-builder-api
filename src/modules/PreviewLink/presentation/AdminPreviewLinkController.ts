import type { Request, Response } from 'express';
import { z } from 'zod';
import type { GeneratePreviewLinkUseCase } from '../application/GeneratePreviewLinkUseCase';
import type { RevokePreviewLinkUseCase } from '../application/RevokePreviewLinkUseCase';

const generateSchema = z.strictObject({
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export class AdminPreviewLinkController {
  constructor(
    private readonly generateUseCase: GeneratePreviewLinkUseCase,
    private readonly revokeUseCase: RevokePreviewLinkUseCase,
  ) {}

  public readonly generate = async (req: Request, res: Response): Promise<void> => {
    const input = generateSchema.parse(req.body);
    const tenantId = req.params.tenantId;
    if (typeof tenantId !== 'string') {
      res.status(400).json({ error: 'Missing tenantId' });
      return;
    }

    const result = await this.generateUseCase.execute(tenantId, input);
    res.status(201).json(result);
  };

  public readonly revoke = async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.params.tenantId;
    const linkId = req.params.id;
    if (typeof tenantId !== 'string' || typeof linkId !== 'string') {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    await this.revokeUseCase.execute(tenantId, linkId);
    res.status(204).end();
  };
}
