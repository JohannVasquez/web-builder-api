import { z } from 'zod';
import { Page, PageSection } from './Page';

// Foto del contenido de una página. Es lo que se publica y lo que guarda cada versión.
export const PageSnapshotSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  sections: z.array(
    z.object({
      type: z.string(),
      position: z.number().int(),
      props: z.record(z.string(), z.unknown()),
      anchor: z.string().nullable(),
    }),
  ),
});

export type PageSnapshot = z.infer<typeof PageSnapshotSchema>;

export const snapshotOf = (page: Page): PageSnapshot => ({
  title: page.title,
  description: page.description,
  sections: [...page.sections]
    .sort((a, b) => a.position - b.position)
    .map((section) => ({
      type: section.type,
      position: section.position,
      props: section.props,
      anchor: section.anchor,
    })),
});

// Una foto inválida no se sirve a medias: el llamador decide qué hacer con `null`.
export const pageFromSnapshot = (slug: string, snapshot: unknown): Page | null => {
  const parsed = PageSnapshotSchema.safeParse(snapshot);
  if (!parsed.success) {
    return null;
  }
  return new Page(
    slug,
    parsed.data.title,
    parsed.data.description,
    parsed.data.sections.map(
      (section) =>
        new PageSection(section.type, section.position, section.props, section.anchor),
    ),
  );
};
