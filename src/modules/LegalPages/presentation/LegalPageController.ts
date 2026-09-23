import type { Request, Response } from 'express';
import { z } from 'zod';
import type { CreateLegalPageUseCase } from '../application/CreateLegalPageUseCase';
import { LEGAL_PAGE_TEMPLATES } from '../domain/legalTemplates';
import { idSchema } from '@/shared/domain/identifier';

const TenantIdSchema = idSchema;
const BodySchema = z.strictObject({ kind: z.enum(['privacidad', 'terminos', 'compra']) });

export class LegalPageController {
  constructor(private readonly createLegalPageUseCase: CreateLegalPageUseCase) {}

  public readonly list = (_req: Request, res: Response): void => {
    res.json({
      legalTemplates: LEGAL_PAGE_TEMPLATES.map((template) => ({
        kind: template.kind,
        slug: template.slug,
        title: template.title,
        description: template.description,
      })),
    });
  };

  public readonly create = async (req: Request, res: Response): Promise<void> => {
    const tenantId = TenantIdSchema.parse(req.params.tenantId);
    const { kind } = BodySchema.parse(req.body);
    const page = await this.createLegalPageUseCase.execute(tenantId, kind);
    res.status(201).json({ page: page.toAdminPrimitives() });
  };
}
