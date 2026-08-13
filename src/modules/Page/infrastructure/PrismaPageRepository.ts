import { z } from 'zod';
import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';
import { Page, PageSection } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';

const propsSchema = z.record(z.string(), z.unknown());

export class PrismaPageRepository implements PageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findBySlug(slug: string): Promise<Page | null> {
    const record = await this.prisma.page.findUnique({
      where: { slug, isPublished: true },
      include: { sections: { orderBy: { position: 'asc' } } },
    });

    if (record === null) {
      return null;
    }

    const sections = record.sections.map(
      (section) =>
        new PageSection(
          section.type,
          section.position,
          propsSchema.parse(section.props),
          section.anchor,
        ),
    );

    return new Page(record.slug, record.title, record.description, sections);
  }
}
