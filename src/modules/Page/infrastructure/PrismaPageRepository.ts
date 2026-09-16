import { z } from 'zod';
import {
  Prisma,
  type PrismaClient,
} from '../../../shared/infrastructure/prisma/generated/client';
import { Page, PageSection } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';
import type { PageInput, PageUpdateInput } from '../domain/PageSchema';
import type {
  PageSectionInput,
  PageSectionUpdateInput,
} from '../domain/PageSectionSchema';
import { PageIdNotFoundError } from '../domain/PageIdNotFoundError';
import { PageSlugConflictError } from '../domain/PageSlugConflictError';
import { SectionNotFoundError } from '../domain/SectionNotFoundError';
import { SectionPositionConflictError } from '../domain/SectionPositionConflictError';
import { ReorderMismatchError } from '../domain/ReorderMismatchError';

const propsSchema = z.record(z.string(), z.unknown());

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === UNIQUE_CONSTRAINT_VIOLATION;

interface PageRecord {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly description: string | null;
  readonly isPublished: boolean;
  readonly updatedAt?: Date | null;
  readonly sections: readonly SectionRecord[];
}

interface SectionRecord {
  readonly id: number;
  readonly type: string;
  readonly position: number;
  readonly props: unknown;
  readonly anchor: string | null;
}

const SECTIONS_INCLUDE = { sections: { orderBy: { position: 'asc' as const } } };

export class PrismaPageRepository implements PageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findBySlug(tenantId: number, slug: string): Promise<Page | null> {
    const record = await this.prisma.page.findUnique({
      where: { tenantId_slug: { tenantId, slug }, isPublished: true },
      include: SECTIONS_INCLUDE,
    });
    return record === null ? null : this.toDomain(record);
  }

  public async findAllByTenant(tenantId: number): Promise<Page[]> {
    const records = await this.prisma.page.findMany({
      where: { tenantId },
      include: SECTIONS_INCLUDE,
      orderBy: { slug: 'asc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  public async findById(tenantId: number, id: number): Promise<Page | null> {
    const record = await this.prisma.page.findFirst({
      where: { id, tenantId },
      include: SECTIONS_INCLUDE,
    });
    return record === null ? null : this.toDomain(record);
  }

  public async create(tenantId: number, input: PageInput): Promise<Page> {
    try {
      const record = await this.prisma.page.create({
        data: {
          tenantId,
          slug: input.slug,
          title: input.title,
          description: input.description ?? null,
          isPublished: input.isPublished,
        },
        include: SECTIONS_INCLUDE,
      });
      return this.toDomain(record);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new PageSlugConflictError(input.slug);
      }
      throw error;
    }
  }

  public async update(
    tenantId: number,
    id: number,
    input: PageUpdateInput,
  ): Promise<Page> {
    await this.ensurePageOwnership(tenantId, id);
    try {
      await this.prisma.page.update({
        where: { id },
        data: {
          slug: input.slug,
          title: input.title,
          description: input.description,
          isPublished: input.isPublished,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error) && input.slug !== undefined) {
        throw new PageSlugConflictError(input.slug);
      }
      throw error;
    }
    return this.reload(tenantId, id);
  }

  public async delete(tenantId: number, id: number): Promise<void> {
    await this.ensurePageOwnership(tenantId, id);
    await this.prisma.page.delete({ where: { id } });
  }

  public async addSection(
    tenantId: number,
    pageId: number,
    input: PageSectionInput,
  ): Promise<Page> {
    await this.ensurePageOwnership(tenantId, pageId);
    try {
      await this.prisma.pageSection.create({
        data: {
          pageId,
          type: input.type,
          position: input.position,
          props: input.props as Prisma.InputJsonValue,
          anchor: input.anchor ?? null,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new SectionPositionConflictError(input.position);
      }
      throw error;
    }
    return this.reload(tenantId, pageId);
  }

  public async updateSection(
    tenantId: number,
    pageId: number,
    sectionId: number,
    input: PageSectionUpdateInput,
  ): Promise<Page> {
    await this.ensureSectionOwnership(tenantId, pageId, sectionId);
    try {
      await this.prisma.pageSection.update({
        where: { id: sectionId },
        data: {
          type: input.type,
          position: input.position,
          props: input.props as Prisma.InputJsonValue | undefined,
          anchor: input.anchor,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error) && input.position !== undefined) {
        throw new SectionPositionConflictError(input.position);
      }
      throw error;
    }
    return this.reload(tenantId, pageId);
  }

  public async deleteSection(
    tenantId: number,
    pageId: number,
    sectionId: number,
  ): Promise<Page> {
    await this.ensureSectionOwnership(tenantId, pageId, sectionId);
    await this.prisma.pageSection.delete({ where: { id: sectionId } });
    return this.reload(tenantId, pageId);
  }

  public async reorderSections(
    tenantId: number,
    pageId: number,
    orderedSectionIds: readonly number[],
  ): Promise<Page> {
    const page = await this.ensurePageOwnership(tenantId, pageId);
    const currentIds = new Set(page.sections.map((section) => section.id));
    const isSameSet =
      currentIds.size === orderedSectionIds.length &&
      orderedSectionIds.every((id) => currentIds.has(id));
    if (!isSameSet) {
      throw new ReorderMismatchError();
    }

    // Dos pasadas para no chocar con `@@unique([pageId, position])`: primero
    // se mueve todo a posiciones negativas (nunca colisionan con las
    // positivas existentes), luego se fija el orden final 1..N.
    await this.prisma.$transaction(
      orderedSectionIds.map((id, index) =>
        this.prisma.pageSection.update({
          where: { id },
          data: { position: -(index + 1) },
        }),
      ),
    );
    await this.prisma.$transaction(
      orderedSectionIds.map((id, index) =>
        this.prisma.pageSection.update({
          where: { id },
          data: { position: index + 1 },
        }),
      ),
    );

    return this.reload(tenantId, pageId);
  }

  /** Confirma que la página existe y pertenece al tenant; retorna el registro para reutilizar sus datos (ej. `reorderSections`). */
  private async ensurePageOwnership(
    tenantId: number,
    pageId: number,
  ): Promise<PageRecord> {
    const record = await this.prisma.page.findFirst({
      where: { id: pageId, tenantId },
      include: SECTIONS_INCLUDE,
    });
    if (record === null) {
      throw new PageIdNotFoundError(pageId);
    }
    return record;
  }

  private async ensureSectionOwnership(
    tenantId: number,
    pageId: number,
    sectionId: number,
  ): Promise<void> {
    const page = await this.ensurePageOwnership(tenantId, pageId);
    const belongsToPage = page.sections.some((section) => section.id === sectionId);
    if (!belongsToPage) {
      throw new SectionNotFoundError(sectionId);
    }
  }

  private async reload(tenantId: number, pageId: number): Promise<Page> {
    const page = await this.findById(tenantId, pageId);
    if (page === null) {
      throw new PageIdNotFoundError(pageId);
    }
    return page;
  }

  private toDomain(record: PageRecord): Page {
    const sections = record.sections.map(
      (section) =>
        new PageSection(
          section.type,
          section.position,
          propsSchema.parse(section.props),
          section.anchor,
          section.id,
        ),
    );
    return new Page(
      record.slug,
      record.title,
      record.description,
      sections,
      record.id,
      record.isPublished,
      record.updatedAt ?? null,
    );
  }
}
