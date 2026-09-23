import { BlogPostRepository } from '../domain/BlogPostRepository';
import { BlogPostNotFoundError } from '../domain/BlogPostNotFoundError';
import { ResolveBlogImagesUseCase } from './ResolveBlogImagesUseCase';
import { toSummaryView, type BlogPostDetailView } from './BlogPostView';

const RELATED_LIMIT = 3;

export class GetBlogPostUseCase {
  constructor(
    private readonly repository: BlogPostRepository,
    private readonly images: ResolveBlogImagesUseCase,
  ) {}

  public async execute(
    tenantId: string,
    slug: string,
    now = new Date(),
  ): Promise<BlogPostDetailView> {
    const post = await this.repository.findVisibleBySlug(tenantId, slug, now);
    if (post === null) {
      throw new BlogPostNotFoundError(slug);
    }

    const sign = (key: string | null): Promise<string | null> => this.images.signKey(key);
    const related = await this.repository.listRelatedVisible(
      tenantId,
      post.id,
      post.tags,
      now,
      RELATED_LIMIT,
    );

    return {
      ...(await toSummaryView(post, sign)),
      content: await this.images.execute(post.content),
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      ogImageUrl: await sign(post.ogImageKey),
      related: await Promise.all(related.map((item) => toSummaryView(item, sign))),
    };
  }
}
