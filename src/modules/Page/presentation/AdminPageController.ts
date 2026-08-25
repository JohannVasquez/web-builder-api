import type { Request, Response } from 'express';
import { z } from 'zod';
import type { ListPagesUseCase } from '../application/ListPagesUseCase';
import type { GetPageByIdUseCase } from '../application/GetPageByIdUseCase';
import type { CreatePageUseCase } from '../application/CreatePageUseCase';
import type { UpdatePageUseCase } from '../application/UpdatePageUseCase';
import type { DeletePageUseCase } from '../application/DeletePageUseCase';
import type { AddSectionUseCase } from '../application/AddSectionUseCase';
import type { UpdateSectionUseCase } from '../application/UpdateSectionUseCase';
import type { DeleteSectionUseCase } from '../application/DeleteSectionUseCase';
import type { ReorderSectionsUseCase } from '../application/ReorderSectionsUseCase';
import { PageInputSchema, PageUpdateSchema } from '../domain/PageSchema';
import {
  PageSectionInputSchema,
  PageSectionUpdateSchema,
  ReorderSectionsSchema,
} from '../domain/PageSectionSchema';

const tenantParamsSchema = z.object({ tenantId: z.coerce.number().int().positive() });
const pageParamsSchema = tenantParamsSchema.extend({
  pageId: z.coerce.number().int().positive(),
});
const sectionParamsSchema = pageParamsSchema.extend({
  sectionId: z.coerce.number().int().positive(),
});

export class AdminPageController {
  constructor(
    private readonly listPagesUseCase: ListPagesUseCase,
    private readonly getPageByIdUseCase: GetPageByIdUseCase,
    private readonly createPageUseCase: CreatePageUseCase,
    private readonly updatePageUseCase: UpdatePageUseCase,
    private readonly deletePageUseCase: DeletePageUseCase,
    private readonly addSectionUseCase: AddSectionUseCase,
    private readonly updateSectionUseCase: UpdateSectionUseCase,
    private readonly deleteSectionUseCase: DeleteSectionUseCase,
    private readonly reorderSectionsUseCase: ReorderSectionsUseCase,
  ) {}

  public readonly list = async (req: Request, res: Response): Promise<void> => {
    const { tenantId } = tenantParamsSchema.parse(req.params);
    const pages = await this.listPagesUseCase.execute(tenantId);
    res.status(200).json({ pages: pages.map((page) => page.toAdminPrimitives()) });
  };

  public readonly get = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, pageId } = pageParamsSchema.parse(req.params);
    const page = await this.getPageByIdUseCase.execute(tenantId, pageId);
    res.status(200).json({ page: page.toAdminPrimitives() });
  };

  public readonly create = async (req: Request, res: Response): Promise<void> => {
    const { tenantId } = tenantParamsSchema.parse(req.params);
    const input = PageInputSchema.parse(req.body);
    const page = await this.createPageUseCase.execute(tenantId, input);
    res.status(201).json({ page: page.toAdminPrimitives() });
  };

  public readonly update = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, pageId } = pageParamsSchema.parse(req.params);
    const input = PageUpdateSchema.parse(req.body);
    const page = await this.updatePageUseCase.execute(tenantId, pageId, input);
    res.status(200).json({ page: page.toAdminPrimitives() });
  };

  public readonly remove = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, pageId } = pageParamsSchema.parse(req.params);
    await this.deletePageUseCase.execute(tenantId, pageId);
    res.status(204).send();
  };

  public readonly addSection = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, pageId } = pageParamsSchema.parse(req.params);
    const input = PageSectionInputSchema.parse(req.body);
    const page = await this.addSectionUseCase.execute(tenantId, pageId, input);
    res.status(201).json({ page: page.toAdminPrimitives() });
  };

  public readonly updateSection = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, pageId, sectionId } = sectionParamsSchema.parse(req.params);
    const input = PageSectionUpdateSchema.parse(req.body);
    const page = await this.updateSectionUseCase.execute(
      tenantId,
      pageId,
      sectionId,
      input,
    );
    res.status(200).json({ page: page.toAdminPrimitives() });
  };

  public readonly deleteSection = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, pageId, sectionId } = sectionParamsSchema.parse(req.params);
    const page = await this.deleteSectionUseCase.execute(tenantId, pageId, sectionId);
    res.status(200).json({ page: page.toAdminPrimitives() });
  };

  public readonly reorderSections = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { tenantId, pageId } = pageParamsSchema.parse(req.params);
    const { sectionIds } = ReorderSectionsSchema.parse(req.body);
    const page = await this.reorderSectionsUseCase.execute(tenantId, pageId, sectionIds);
    res.status(200).json({ page: page.toAdminPrimitives() });
  };
}
