import {
  Prisma,
  type PrismaClient,
} from '@/shared/infrastructure/prisma/generated/client';
import { BlogPost, type BlogPostStatus } from '../domain/BlogPost';
import { BlogContentSchema } from '../domain/BlogPostContentSchema';
import type {
  BlogPostRepository,
  ListVisibleBlogPostsOptions,
} from '../domain/BlogPostRepository';
import type { BlogPostInput, BlogPostUpdateInput } from '../domain/BlogPostSchema';
import { BlogPostIdNotFoundError } from '../domain/BlogPostIdNotFoundError';
import { BlogSlugConflictError } from '../domain/BlogSlugConflictError';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === UNIQUE_CONSTRAINT_VIOLATION;

interface BlogPostRecord {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly coverImageKey: string | null;
  readonly content: unknown;
  readonly authorName: string;
  readonly status: string;
  readonly publishedAt: Date | null;
  readonly tags: string[];
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly ogImageKey: string | null;
  readonly noindex?: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// Prisma tipa las columnas JSON con su propio `InputJsonValue`, que no acepta un tipo
// inferido por zod. Mismo cruce que en PrismaPageRepository.
const asJsonColumn = (value: unknown): object => value as object;

// Único lugar del repositorio que decide si una publicación es visible al público: una
// publicada lo es siempre, y una programada solo cuando su fecha ya llegó. Se resuelve
// como cláusula WHERE (no filtrando en JS después de traer todo) para que escale igual
// con 10 o con 10.000 publicaciones — por eso no hay ningún cron.
const visibleWhere = (now: Date): Prisma.BlogPostWhereInput => ({
  OR: [{ status: 'published' }, { status: 'scheduled', publishedAt: { lte: now } }],
});

// Publicar sin fecha marca "ahora"; el resto respeta lo que mandó el admin (o null si
// queda en borrador). Espeja `PrismaPageRepository.publish`, que también fija `publishedAt`.
const resolvePublishedAt = (
  status: BlogPostStatus | undefined,
  publishedAt: Date | null | undefined,
): Date | null | undefined => {
  if (status === 'published' && (publishedAt === null || publishedAt === undefined)) {
    return new Date();
  }
  return publishedAt;
};

export class PrismaBlogPostRepository implements BlogPostRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findVisibleBySlug(
    tenantId: string,
    slug: string,
    now: Date,
  ): Promise<BlogPost | null> {
    const record = await this.prisma.blogPost.findFirst({
      where: { tenantId, slug, ...visibleWhere(now) },
    });
    return record === null ? null : this.toDomain(record);
  }

  public async listVisible(
    tenantId: string,
    options: ListVisibleBlogPostsOptions,
    now: Date,
  ): Promise<{ posts: BlogPost[]; total: number }> {
    const where: Prisma.BlogPostWhereInput = {
      tenantId,
      ...visibleWhere(now),
      ...(options.tag !== undefined ? { tags: { has: options.tag } } : {}),
    };
    const [records, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take: options.perPage,
        skip: (options.page - 1) * options.perPage,
      }),
      this.prisma.blogPost.count({ where }),
    ]);
    return { posts: records.map((record) => this.toDomain(record)), total };
  }

  public async listRelatedVisible(
    tenantId: string,
    excludePostId: string,
    tags: readonly string[],
    now: Date,
    limit: number,
  ): Promise<BlogPost[]> {
    const records = await this.prisma.blogPost.findMany({
      where: {
        tenantId,
        id: { not: excludePostId },
        tags: { hasSome: [...tags] },
        ...visibleWhere(now),
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  public async findAllByTenant(tenantId: string): Promise<BlogPost[]> {
    const records = await this.prisma.blogPost.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  public async findById(tenantId: string, id: string): Promise<BlogPost | null> {
    const record = await this.prisma.blogPost.findFirst({ where: { id, tenantId } });
    return record === null ? null : this.toDomain(record);
  }

  public async create(tenantId: string, input: BlogPostInput): Promise<BlogPost> {
    try {
      const record = await this.prisma.blogPost.create({
        data: {
          tenantId,
          slug: input.slug,
          title: input.title,
          excerpt: input.excerpt,
          coverImageKey: input.coverImageKey ?? null,
          content: asJsonColumn(input.content),
          authorName: input.authorName,
          status: input.status,
          publishedAt:
            resolvePublishedAt(input.status, input.publishedAt ?? null) ?? null,
          tags: input.tags,
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
          ogImageKey: input.ogImageKey ?? null,
          noindex: input.noindex,
        },
      });
      return this.toDomain(record);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BlogSlugConflictError(input.slug);
      }
      throw error;
    }
  }

  public async update(
    tenantId: string,
    id: string,
    input: BlogPostUpdateInput,
  ): Promise<BlogPost> {
    await this.ensurePostOwnership(tenantId, id);
    try {
      await this.prisma.blogPost.update({
        where: { id },
        data: {
          slug: input.slug,
          title: input.title,
          excerpt: input.excerpt,
          coverImageKey: input.coverImageKey,
          content: input.content !== undefined ? asJsonColumn(input.content) : undefined,
          authorName: input.authorName,
          status: input.status,
          publishedAt: resolvePublishedAt(input.status, input.publishedAt),
          tags: input.tags,
          seoTitle: input.seoTitle,
          seoDescription: input.seoDescription,
          ogImageKey: input.ogImageKey,
          noindex: input.noindex,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error) && input.slug !== undefined) {
        throw new BlogSlugConflictError(input.slug);
      }
      throw error;
    }
    return this.reload(tenantId, id);
  }

  public async delete(tenantId: string, id: string): Promise<void> {
    await this.ensurePostOwnership(tenantId, id);
    await this.prisma.blogPost.delete({ where: { id } });
  }

  private async ensurePostOwnership(tenantId: string, id: string): Promise<void> {
    const record = await this.prisma.blogPost.findFirst({ where: { id, tenantId } });
    if (record === null) {
      throw new BlogPostIdNotFoundError(id);
    }
  }

  private async reload(tenantId: string, id: string): Promise<BlogPost> {
    const post = await this.findById(tenantId, id);
    if (post === null) {
      throw new BlogPostIdNotFoundError(id);
    }
    return post;
  }

  private toDomain(record: BlogPostRecord): BlogPost {
    return new BlogPost(
      record.id,
      record.slug,
      record.title,
      record.excerpt,
      record.coverImageKey,
      BlogContentSchema.parse(record.content),
      record.authorName,
      record.status as BlogPostStatus,
      record.publishedAt,
      record.tags,
      record.seoTitle,
      record.seoDescription,
      record.ogImageKey,
      record.createdAt,
      record.updatedAt,
      record.noindex ?? false,
    );
  }
}
