import type { BlogContent } from './BlogPostContentSchema';

export type BlogPostStatus = 'draft' | 'published' | 'scheduled';

export interface BlogPostPrimitives {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly coverImageKey: string | null;
  readonly content: BlogContent;
  readonly authorName: string;
  readonly status: BlogPostStatus;
  readonly publishedAt: string | null;
  readonly tags: readonly string[];
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly ogImageKey: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly noindex: boolean;
}

// Sin variante "admin" vs "pública" como Page: acá la diferencia (URLs firmadas,
// readingMinutes, related) se calcula en la capa application, no en toPrimitives.
export class BlogPost {
  constructor(
    public readonly id: string,
    public readonly slug: string,
    public readonly title: string,
    public readonly excerpt: string,
    public readonly coverImageKey: string | null,
    public readonly content: BlogContent,
    public readonly authorName: string,
    public readonly status: BlogPostStatus,
    public readonly publishedAt: Date | null,
    public readonly tags: readonly string[],
    public readonly seoTitle: string | null,
    public readonly seoDescription: string | null,
    public readonly ogImageKey: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly noindex: boolean = false,
  ) {}

  public toPrimitives(): BlogPostPrimitives {
    return {
      id: this.id,
      slug: this.slug,
      title: this.title,
      excerpt: this.excerpt,
      coverImageKey: this.coverImageKey,
      content: this.content,
      authorName: this.authorName,
      status: this.status,
      publishedAt: this.publishedAt?.toISOString() ?? null,
      tags: this.tags,
      seoTitle: this.seoTitle,
      seoDescription: this.seoDescription,
      ogImageKey: this.ogImageKey,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      noindex: this.noindex,
    };
  }
}
