import type { Request, Response } from 'express';
import { z } from 'zod';
import type { GetBrandUseCase } from '../application/GetBrandUseCase';
import type { UpdateBrandUseCase } from '../application/UpdateBrandUseCase';
import { BrandUpdateSchema } from '../domain/BrandSchema';
import { FONT_PAIRINGS } from '../domain/fontPairings';

const TenantIdSchema = z.coerce.number().int().positive();

export class AdminBrandController {
  constructor(
    private readonly getBrandUseCase: GetBrandUseCase,
    private readonly updateBrandUseCase: UpdateBrandUseCase,
  ) {}

  public readonly get = async (req: Request, res: Response): Promise<void> => {
    const tenantId = TenantIdSchema.parse(req.params.tenantId);
    res.json({ brand: await this.getBrandUseCase.execute(tenantId) });
  };

  public readonly update = async (req: Request, res: Response): Promise<void> => {
    const tenantId = TenantIdSchema.parse(req.params.tenantId);
    const changes = BrandUpdateSchema.parse(req.body);
    res.json({ brand: await this.updateBrandUseCase.execute(tenantId, changes) });
  };

  // Autodescripción para el panel y el MCP (SPEC 10.5): qué tipografías existen.
  public readonly listFontPairings = (_req: Request, res: Response): void => {
    res.json({ fontPairings: FONT_PAIRINGS });
  };
}
