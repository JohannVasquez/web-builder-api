import type { BlogPost } from '../domain/BlogPost';
import type { BlogContent } from '../domain/BlogPostContentSchema';
import { calculateReadingMinutes } from './calculateReadingMinutes';

export interface BlogPostSummaryView {
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly coverImageUrl: string | null;
  /** La misma portada como clave; la URL firmada caduca y no sirve para `next/image`. */
  readonly coverImageKey: string | null;
  readonly authorName: string;
  readonly publishedAt: string | null;
  readonly tags: readonly string[];
  readonly readingMinutes: number;
  // Alimenta el `dateModified` del dato estructurado y el `lastmod` del sitemap.
  readonly updatedAt: string;
  // Publicada pero fuera del índice: el enlace funciona, el buscador no la lista.
  readonly noindex: boolean;
}

export interface BlogPostDetailView extends BlogPostSummaryView {
  readonly content: BlogContent;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly ogImageUrl: string | null;
  readonly related: readonly BlogPostSummaryView[];
}

export type SignKey = (key: string | null) => Promise<string | null>;

export const toSummaryView = async (
  post: BlogPost,
  sign: SignKey,
): Promise<BlogPostSummaryView> => ({
  slug: post.slug,
  title: post.title,
  excerpt: post.excerpt,
  coverImageUrl: await sign(post.coverImageKey),
  coverImageKey: post.coverImageKey,
  authorName: post.authorName,
  publishedAt: post.publishedAt?.toISOString() ?? null,
  tags: post.tags,
  updatedAt: post.updatedAt.toISOString(),
  noindex: post.noindex,
  // Se recalcula en cada lectura en vez de guardarse: cambiar el texto y dejar el tiempo
  // viejo es la forma más fácil de que quede mal para siempre.
  readingMinutes: calculateReadingMinutes(post.content),
});
