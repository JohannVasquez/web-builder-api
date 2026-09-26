import { z } from 'zod';
import { BlogContentSchema } from './BlogPostContentSchema';

const slugSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');
const titleSchema = z.string().min(1).max(255);
const excerptSchema = z.string().min(1).max(500);
const authorNameSchema = z.string().min(1).max(255);
const statusSchema = z.enum(['draft', 'published', 'scheduled']);
const tagSchema = z.array(z.string().min(1).max(50)).max(20);
const seoTitleSchema = z.string().max(255).nullable().optional();
const seoDescriptionSchema = z.string().max(500).nullable().optional();
const imageKeySchema = z.string().max(500).nullable().optional();
const publishedAtSchema = z.coerce.date().nullable().optional();

export const BlogPostInputSchema = z.strictObject({
  slug: slugSchema,
  title: titleSchema,
  excerpt: excerptSchema,
  coverImageKey: imageKeySchema,
  content: BlogContentSchema.default([]),
  authorName: authorNameSchema,
  status: statusSchema.default('draft'),
  publishedAt: publishedAtSchema,
  tags: tagSchema.default([]),
  seoTitle: seoTitleSchema,
  seoDescription: seoDescriptionSchema,
  ogImageKey: imageKeySchema,
  // Publicada pero fuera del índice: el enlace funciona, el buscador no la lista.
  noindex: z.boolean().default(false),
});

export type BlogPostInput = z.infer<typeof BlogPostInputSchema>;

// No es `BlogPostInputSchema.partial()`: igual que en PageSchema, `.partial()` no borra
// los `.default()` (content, status, tags), así que un PATCH sin esos campos los pisaría.
export const BlogPostUpdateSchema = z.strictObject({
  slug: slugSchema.optional(),
  title: titleSchema.optional(),
  excerpt: excerptSchema.optional(),
  coverImageKey: imageKeySchema,
  content: BlogContentSchema.optional(),
  authorName: authorNameSchema.optional(),
  status: statusSchema.optional(),
  publishedAt: publishedAtSchema,
  tags: tagSchema.optional(),
  seoTitle: seoTitleSchema,
  seoDescription: seoDescriptionSchema,
  ogImageKey: imageKeySchema,
  noindex: z.boolean().optional(),
});

export type BlogPostUpdateInput = z.infer<typeof BlogPostUpdateSchema>;
