import type { Request, Response } from 'express';
import { z } from 'zod';
import type { SearchActivityUseCase } from '../application/SearchActivityUseCase';
import { idSchema } from '@/shared/domain/identifier';

const ActivityQuerySchema = z.object({
  tenantId: idSchema.optional(),
  actorType: z.enum(['admin', 'apiKey']).optional(),
  actorId: idSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export class ActivityLogController {
  constructor(private readonly searchActivityUseCase: SearchActivityUseCase) {}

  public readonly list = async (req: Request, res: Response): Promise<void> => {
    const query = ActivityQuerySchema.parse(req.query);
    res.json(await this.searchActivityUseCase.execute(query));
  };
}
