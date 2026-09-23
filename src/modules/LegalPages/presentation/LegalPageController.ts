import type { Request, Response } from 'express';
import { z } from 'zod';
import type { CreateLegalPageUseCase } from '../application/CreateLegalPageUseCase';
import {
  LEGAL_PAGE_TEMPLATES,
  LEGAL_REVIEW_NOTICE,
  LEGAL_TEMPLATES_VERSION,
} from '../domain/legalTemplates';
import { idSchema } from '@/shared/domain/identifier';

const TenantIdSchema = idSchema;
const BodySchema = z.strictObject({
  kind: z.enum(['privacidad', 'cookies', 'terminos', 'compra']),
});

export class LegalPageController {
  constructor(private readonly createLegalPageUseCase: CreateLegalPageUseCase) {}

  public readonly list = (_req: Request, res: Response): void => {
    res.json({
      // El aviso viaja con la lista para que el panel no pueda mostrar las plantillas sin
      // decir que son un borrador: quien las publica tal cual asume el riesgo.
      reviewNotice: LEGAL_REVIEW_NOTICE,
      version: LEGAL_TEMPLATES_VERSION,
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
