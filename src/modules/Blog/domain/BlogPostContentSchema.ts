import { z } from 'zod';

// Extensible: cada bloque nuevo se agrega como una entrada más de este discriminated union.
const ParagraphBlockSchema = z.strictObject({
  type: z.literal('paragraph'),
  text: z.string().min(1),
});
const HeadingBlockSchema = z.strictObject({
  type: z.literal('heading'),
  level: z.union([z.literal(2), z.literal(3)]),
  text: z.string().min(1),
});
const ListBlockSchema = z.strictObject({
  type: z.literal('list'),
  ordered: z.boolean(),
  items: z.array(z.string().min(1)).min(1),
});
const QuoteBlockSchema = z.strictObject({
  type: z.literal('quote'),
  text: z.string().min(1),
  cite: z.string().min(1).optional(),
});
// `key` es del bucket privado, nunca una URL: se firma al vuelo en cada lectura pública.
const ImageBlockSchema = z.strictObject({
  type: z.literal('image'),
  key: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().min(1).optional(),
});
const VideoBlockSchema = z.strictObject({
  type: z.literal('video'),
  url: z.url(),
  caption: z.string().min(1).optional(),
});
const DividerBlockSchema = z.strictObject({ type: z.literal('divider') });

export const BlogBlockSchema = z.discriminatedUnion('type', [
  ParagraphBlockSchema,
  HeadingBlockSchema,
  ListBlockSchema,
  QuoteBlockSchema,
  ImageBlockSchema,
  VideoBlockSchema,
  DividerBlockSchema,
]);

export type BlogBlock = z.infer<typeof BlogBlockSchema>;
export type BlogImageBlock = z.infer<typeof ImageBlockSchema>;

export const BlogContentSchema = z.array(BlogBlockSchema);

export type BlogContent = z.infer<typeof BlogContentSchema>;
