import type { Pool } from 'pg';
import { z } from 'zod';
import { Page, PageSection } from '../domain/Page';
import type { PageRepository } from '../domain/PageRepository';

const sectionsRowSchema = z.array(
  z.object({
    type: z.string(),
    position: z.number(),
    props: z.record(z.string(), z.unknown()),
  }),
);

interface PageRow {
  readonly slug: string;
  readonly title: string;
  readonly description: string | null;
  readonly sections: unknown;
}

const FIND_BY_SLUG_QUERY = `
  SELECT
    p.slug,
    p.title,
    p.description,
    COALESCE(
      json_agg(
        json_build_object('type', s.type, 'position', s.position, 'props', s.props)
        ORDER BY s.position
      ) FILTER (WHERE s.id IS NOT NULL),
      '[]'::json
    ) AS sections
  FROM pages p
  LEFT JOIN page_sections s ON s.page_id = p.id
  WHERE p.slug = $1 AND p.is_published = TRUE
  GROUP BY p.id
`;

export class PostgresPageRepository implements PageRepository {
  constructor(private readonly pool: Pool) {}

  public async findBySlug(slug: string): Promise<Page | null> {
    const result = await this.pool.query<PageRow>(FIND_BY_SLUG_QUERY, [slug]);
    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }

    const sections = sectionsRowSchema
      .parse(row.sections)
      .map((section) => new PageSection(section.type, section.position, section.props));

    return new Page(row.slug, row.title, row.description, sections);
  }
}
