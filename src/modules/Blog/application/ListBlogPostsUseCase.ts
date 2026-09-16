import { BlogPostRepository } from '../domain/BlogPostRepository';
import { ResolveBlogImagesUseCase } from './ResolveBlogImagesUseCase';
import { toSummaryView, type BlogPostSummaryView } from './BlogPostView';

export interface BlogListResult {
  readonly posts: readonly BlogPostSummaryView[];
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
}

export class ListBlogPostsUseCase {
  constructor(
    private readonly repository: BlogPostRepository,
    private readonly images: ResolveBlogImagesUseCase,
  ) {}

  public async execute(
    tenantId: number,
    page: number,
    perPage: number,
    tag: string | undefined,
    now = new Date(),
  ): Promise<BlogListResult> {
    const { posts, total } = await this.repository.listVisible(
      tenantId,
      { page, perPage, tag },
      now,
    );
    return {
      posts: await Promise.all(
        posts.map((post) => toSummaryView(post, (key) => this.images.signKey(key))),
      ),
      total,
      page,
      perPage,
    };
  }
}
