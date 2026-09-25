import type { PrismaClient } from '@/shared/infrastructure/prisma/generated/client';
import type { Seeder } from './Seeder';

// Prisma tipa las columnas JSON con su propio `InputJsonValue`; este es el punto de cruce.
const asJsonColumn = (value: unknown): object => value as object;

export interface SectionSeed {
  readonly type: string;
  readonly position: number;
  readonly props: Record<string, unknown>;
  /** Permite enlazar la sección con `/slug#ancla` (útil para sitios one-page). */
  readonly anchor?: string;
}

export interface PageSeed {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly seoTitle?: string;
  readonly seoDescription?: string;
  readonly sections: readonly SectionSeed[];
}

export interface PageSeedParams {
  readonly tenantId: string;
  readonly pages: readonly PageSeed[];
}

export class PageSeeder implements Seeder<PageSeedParams> {
  constructor(private readonly prisma: PrismaClient) {}

  public async execute(params: PageSeedParams): Promise<void> {
    for (const page of params.pages) {
      const sections = page.sections.map((section) => ({
        type: section.type,
        position: section.position,
        props: section.props,
        anchor: section.anchor ?? null,
      }));

      // El público lee `publishedContent`, no las filas de `sections`, así que sembrar solo
      // el borrador dejaría los sitios de demostración en blanco.
      // Las filas del borrador llevan `props` como columna JSON; la foto publicada, tal cual.
      const sectionRows = sections.map((section) => ({
        ...section,
        props: asJsonColumn(section.props),
      }));
      const publishedContent = {
        title: page.title,
        description: page.description ?? null,
        sections: sections.map((section) => ({
          type: section.type,
          position: section.position,
          props: section.props,
          anchor: section.anchor,
        })),
      };

      await this.prisma.page.upsert({
        where: { tenantId_slug: { tenantId: params.tenantId, slug: page.slug } },
        update: {
          title: page.title,
          description: page.description,
          seoTitle: page.seoTitle ?? null,
          seoDescription: page.seoDescription ?? null,
          publishedContent: asJsonColumn(publishedContent),
          publishedAt: new Date(),
          sections: { deleteMany: {}, create: sectionRows },
        },
        create: {
          tenantId: params.tenantId,
          slug: page.slug,
          title: page.title,
          description: page.description,
          seoTitle: page.seoTitle ?? null,
          seoDescription: page.seoDescription ?? null,
          publishedContent: asJsonColumn(publishedContent),
          publishedAt: new Date(),
          sections: { create: sectionRows },
        },
      });
    }
  }
}
