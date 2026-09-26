import { z } from 'zod';
import {
  Prisma,
  type PrismaClient,
} from '@/shared/infrastructure/prisma/generated/client';
import { Page, PageSection } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';
import type { PageInput, PageUpdateInput } from '../domain/PageSchema';
import type {
  PageSectionInput,
  PageSectionUpdateInput,
} from '../domain/PageSectionSchema';
import { PageIdNotFoundError } from '../domain/PageIdNotFoundError';
import { pageFromSnapshot, snapshotOf, type PageSnapshot } from '../domain/PageSnapshot';
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
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string | null;
  readonly isPublished: boolean;
  readonly updatedAt?: Date | null;
  readonly visualStyle?: string | null;
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
  readonly ogImageKey?: string | null;
  readonly noindex?: boolean;
  readonly sections: readonly SectionRecord[];
}

interface SectionRecord {
  readonly id: string;
  readonly type: string;
  readonly position: number;
  readonly props: unknown;
  readonly anchor: string | null;
  readonly isHidden: boolean;
}

const SECTIONS_INCLUDE = { sections: { orderBy: { position: 'asc' as const } } };

// Prisma tipa las columnas JSON con su propio `InputJsonValue`, que no acepta un tipo
// inferido por zod. Este es el único punto donde se cruza; `unknown` de por medio evita
// que el `as` quede marcado como innecesario cuando el linter resuelve otro tipo.
const asJsonColumn = (value: unknown): object => value as object;

export class PrismaPageRepository implements PageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Sirve la foto publicada, nunca las filas de `sections`: esas son el borrador que
  // alguien puede estar editando ahora mismo.
  public async findPublishedAt(tenantId: string, slug: string): Promise<Date | null> {
    const record = await this.prisma.page.findUnique({
      where: { tenantId_slug: { tenantId, slug }, isPublished: true },
      select: { publishedAt: true, publishedContent: true },
    });
    if (record === null || record.publishedContent === null) {
      return null;
    }
    return record.publishedAt;
  }

  public async findDraftBySlug(tenantId: string, slug: string): Promise<Page | null> {
    const record = await this.prisma.page.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
      include: SECTIONS_INCLUDE,
    });
    return record === null ? null : this.toDomain(record);
  }

  public async findBySlug(tenantId: string, slug: string): Promise<Page | null> {
    const record = await this.prisma.page.findUnique({
      where: { tenantId_slug: { tenantId, slug }, isPublished: true },
      // Los campos de buscador NO viven en la foto publicada: son ajustes de la página, no
      // contenido. Si vivieran ahí, el sitemap (que lee la fila) y la propia página (que lee
      // la foto) podrían contradecirse hasta la siguiente publicación.
      select: {
        publishedContent: true,
        seoTitle: true,
        seoDescription: true,
        ogImageKey: true,
        noindex: true,
      },
    });
    if (record === null || record.publishedContent === null) {
      return null;
    }
    const page = pageFromSnapshot(slug, record.publishedContent);
    return page === null ? null : page.withSeo({
      seoTitle: record.seoTitle,
      seoDescription: record.seoDescription,
      ogImage: record.ogImageKey,
      noindex: record.noindex,
    });
  }

  public async publish(tenantId: string, id: string): Promise<Page> {
    const draft = await this.findById(tenantId, id);
    if (draft === null) {
      throw new PageIdNotFoundError(id);
    }
    await this.prisma.page.update({
      where: { id },
      data: {
        publishedContent: asJsonColumn(snapshotOf(draft)),
        publishedAt: new Date(),
        isPublished: true,
      },
    });
    return this.reload(tenantId, id);
  }

  public async replaceDraft(
    tenantId: string,
    id: string,
    snapshot: PageSnapshot,
  ): Promise<Page> {
    await this.ensurePageOwnership(tenantId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.pageSection.deleteMany({ where: { pageId: id } });
      await tx.page.update({
        where: { id },
        data: {
          title: snapshot.title,
          description: snapshot.description,
          visualStyle: snapshot.visualStyle,
          sections: {
            create: snapshot.sections.map((section, index) => ({
              type: section.type,
              position: index + 1,
              props: asJsonColumn(section.props),
              anchor: section.anchor,
              isHidden: section.isHidden,
            })),
          },
        },
      });
    });
    return this.reload(tenantId, id);
  }

  public async findAllByTenant(tenantId: string): Promise<Page[]> {
    const records = await this.prisma.page.findMany({
      where: { tenantId },
      include: SECTIONS_INCLUDE,
      orderBy: { slug: 'asc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  public async findById(tenantId: string, id: string): Promise<Page | null> {
    const record = await this.prisma.page.findFirst({
      where: { id, tenantId },
      include: SECTIONS_INCLUDE,
    });
    return record === null ? null : this.toDomain(record);
  }

  public async create(tenantId: string, input: PageInput): Promise<Page> {
    try {
      const record = await this.prisma.page.create({
        data: {
          tenantId,
          slug: input.slug,
          title: input.title,
          description: input.description ?? null,
          isPublished: input.isPublished,
          visualStyle: input.visualStyle ?? null,
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
          ogImageKey: input.ogImageKey ?? null,
          noindex: input.noindex,
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
    tenantId: string,
    id: string,
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
          visualStyle: input.visualStyle,
          seoTitle: input.seoTitle,
          seoDescription: input.seoDescription,
          ogImageKey: input.ogImageKey,
          noindex: input.noindex,
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

  public async delete(tenantId: string, id: string): Promise<void> {
    await this.ensurePageOwnership(tenantId, id);
    await this.prisma.page.delete({ where: { id } });
  }

  public async addSection(
    tenantId: string,
    pageId: string,
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
          isHidden: input.isHidden,
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
    tenantId: string,
    pageId: string,
    sectionId: string,
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
          isHidden: input.isHidden,
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

  public async duplicateSection(
    tenantId: string,
    pageId: string,
    sectionId: string,
  ): Promise<Page> {
    await this.ensureSectionOwnership(tenantId, pageId, sectionId);

    await this.prisma.$transaction(async (tx) => {
      const original = await tx.pageSection.findUniqueOrThrow({
        where: { id: sectionId },
      });
      // Las posiciones son únicas por página, así que hay que abrir el hueco antes de
      // escribir la copia. De mayor a menor: al revés chocarían entre ellas.
      const following = await tx.pageSection.findMany({
        where: { pageId, position: { gt: original.position } },
        orderBy: { position: 'desc' },
      });
      for (const section of following) {
        await tx.pageSection.update({
          where: { id: section.id },
          data: { position: section.position + 1 },
        });
      }

      await tx.pageSection.create({
        data: {
          pageId,
          type: original.type,
          position: original.position + 1,
          props: original.props as Prisma.InputJsonValue,
          // El ancla no se copia: dos secciones con la misma haría que un enlace del menú
          // apuntara a cualquiera de las dos.
          anchor: null,
          isHidden: original.isHidden,
        },
      });
    });

    return this.reload(tenantId, pageId);
  }

  public async deleteSection(
    tenantId: string,
    pageId: string,
    sectionId: string,
  ): Promise<Page> {
    await this.ensureSectionOwnership(tenantId, pageId, sectionId);
    await this.prisma.pageSection.delete({ where: { id: sectionId } });
    return this.reload(tenantId, pageId);
  }

  public async reorderSections(
    tenantId: string,
    pageId: string,
    orderedSectionIds: readonly string[],
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
    tenantId: string,
    pageId: string,
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
    tenantId: string,
    pageId: string,
    sectionId: string,
  ): Promise<void> {
    const page = await this.ensurePageOwnership(tenantId, pageId);
    const belongsToPage = page.sections.some((section) => section.id === sectionId);
    if (!belongsToPage) {
      throw new SectionNotFoundError(sectionId);
    }
  }

  private async reload(tenantId: string, pageId: string): Promise<Page> {
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
          section.isHidden,
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
      record.visualStyle ?? null,
      {
        seoTitle: record.seoTitle ?? null,
        seoDescription: record.seoDescription ?? null,
        ogImage: record.ogImageKey ?? null,
        noindex: record.noindex ?? false,
      },
    );
  }
}
