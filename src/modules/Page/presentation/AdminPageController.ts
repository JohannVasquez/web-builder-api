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
import type { PublishPageUseCase } from '../application/PublishPageUseCase';
import type { ListPageVersionsUseCase } from '../application/ListPageVersionsUseCase';
import type { RestorePageVersionUseCase } from '../application/RestorePageVersionUseCase';
import type { RecordPageVersionUseCase } from '../application/RecordPageVersionUseCase';
import type { DuplicateSectionUseCase } from '../application/DuplicateSectionUseCase';
import type { PageVersionActor } from '../domain/PageVersionRepository';
import { getRequestActor } from '@/modules/ApiKey/presentation/actorMiddleware';
import type { Page } from '../domain/Page';
import { PageInputSchema, PageUpdateSchema } from '../domain/PageSchema';
import {
  PageSectionInputSchema,
  PageSectionUpdateSchema,
  ReorderSectionsSchema,
} from '../domain/PageSectionSchema';
import { idSchema } from '@/shared/domain/identifier';

const actorOf = (res: Response): PageVersionActor => {
  const actor = getRequestActor(res);
  return { type: actor.type, id: actor.id, name: actor.name };
};

const tenantParamsSchema = z.object({ tenantId: idSchema });
const pageParamsSchema = tenantParamsSchema.extend({
  pageId: idSchema,
});
const sectionParamsSchema = pageParamsSchema.extend({
  sectionId: idSchema,
});
const versionParamsSchema = pageParamsSchema.extend({
  versionId: idSchema,
});
const versionQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
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
    private readonly duplicateSectionUseCase: DuplicateSectionUseCase,
    private readonly deleteSectionUseCase: DeleteSectionUseCase,
    private readonly reorderSectionsUseCase: ReorderSectionsUseCase,
    private readonly publishPageUseCase: PublishPageUseCase,
    private readonly listPageVersionsUseCase: ListPageVersionsUseCase,
    private readonly restorePageVersionUseCase: RestorePageVersionUseCase,
    private readonly recordPageVersionUseCase: RecordPageVersionUseCase,
  ) {}

  // El historial se escribe aquí y no dentro de cada caso de uso: es el único punto que
  // conoce al actor y ya tiene la página resultante, así que no hay que repetirlo seis veces.
  private async remember(res: Response, page: Page, summary: string): Promise<void> {
    await this.recordPageVersionUseCase.execute(page, summary, actorOf(res));
  }

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
    await this.remember(res, page, 'Creó la página');
    res.status(201).json({ page: page.toAdminPrimitives() });
  };

  public readonly update = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, pageId } = pageParamsSchema.parse(req.params);
    const input = PageUpdateSchema.parse(req.body);
    const page = await this.updatePageUseCase.execute(tenantId, pageId, input);
    await this.remember(res, page, 'Editó los datos de la página');
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
    await this.remember(res, page, `Agregó el bloque ${input.type}`);
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
    await this.remember(res, page, 'Editó un bloque');
    res.status(200).json({ page: page.toAdminPrimitives() });
  };

  public readonly duplicateSection = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { tenantId, pageId, sectionId } = sectionParamsSchema.parse(req.params);
    const page = await this.duplicateSectionUseCase.execute(tenantId, pageId, sectionId);
    await this.remember(res, page, 'Duplicó un bloque');
    res.status(201).json({ page: page.toAdminPrimitives() });
  };

  public readonly deleteSection = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, pageId, sectionId } = sectionParamsSchema.parse(req.params);
    const page = await this.deleteSectionUseCase.execute(tenantId, pageId, sectionId);
    await this.remember(res, page, 'Eliminó un bloque');
    res.status(200).json({ page: page.toAdminPrimitives() });
  };

  public readonly reorderSections = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { tenantId, pageId } = pageParamsSchema.parse(req.params);
    const { sectionIds } = ReorderSectionsSchema.parse(req.body);
    const page = await this.reorderSectionsUseCase.execute(tenantId, pageId, sectionIds);
    await this.remember(res, page, 'Reordenó los bloques');
    res.status(200).json({ page: page.toAdminPrimitives() });
  };

  public readonly publish = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, pageId } = pageParamsSchema.parse(req.params);
    const page = await this.publishPageUseCase.execute(tenantId, pageId, actorOf(res));
    res.status(200).json({ page: page.toAdminPrimitives() });
  };

  public readonly listVersions = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, pageId } = pageParamsSchema.parse(req.params);
    const { limit } = versionQuerySchema.parse(req.query);
    res.json({
      versions: await this.listPageVersionsUseCase.execute(tenantId, pageId, limit),
    });
  };

  public readonly restoreVersion = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, pageId, versionId } = versionParamsSchema.parse(req.params);
    const page = await this.restorePageVersionUseCase.execute(
      tenantId,
      pageId,
      versionId,
      actorOf(res),
    );
    res.status(200).json({ page: page.toAdminPrimitives() });
  };
}
