import type { PrismaClient } from '../../src/shared/infrastructure/prisma/generated/client';
import type { Seeder } from './Seeder';

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
  readonly sections: readonly SectionSeed[];
}

export interface PageSeedParams {
  readonly tenantId: number;
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

      await this.prisma.page.upsert({
        where: { tenantId_slug: { tenantId: params.tenantId, slug: page.slug } },
        update: {
          title: page.title,
          description: page.description,
          sections: { deleteMany: {}, create: sections },
        },
        create: {
          tenantId: params.tenantId,
          slug: page.slug,
          title: page.title,
          description: page.description,
          sections: { create: sections },
        },
      });
    }
  }
}
