import { BlogPostRepository } from '../domain/BlogPostRepository';
import {
  BLOG_PREFIX,
  RecordSlugChangeUseCase,
} from '@/modules/Redirect/application/RecordSlugChangeUseCase';
import { BlogPostIdNotFoundError } from '../domain/BlogPostIdNotFoundError';
import type { BlogPost } from '../domain/BlogPost';
import type { BlogPostInput, BlogPostUpdateInput } from '../domain/BlogPostSchema';

// Los cuatro casos de uso de administración viven juntos porque son una línea cada uno:
// separarlos en cuatro archivos añadiría ceremonia sin añadir claridad.
export class ListAllBlogPostsUseCase {
  constructor(private readonly repository: BlogPostRepository) {}

  public async execute(tenantId: string): Promise<BlogPost[]> {
    return this.repository.findAllByTenant(tenantId);
  }
}

export class GetBlogPostByIdUseCase {
  constructor(private readonly repository: BlogPostRepository) {}

  public async execute(tenantId: string, id: string): Promise<BlogPost> {
    const post = await this.repository.findById(tenantId, id);
    if (post === null) {
      throw new BlogPostIdNotFoundError(id);
    }
    return post;
  }
}

export class CreateBlogPostUseCase {
  constructor(private readonly repository: BlogPostRepository) {}

  public async execute(tenantId: string, input: BlogPostInput): Promise<BlogPost> {
    return this.repository.create(tenantId, input);
  }
}

export class UpdateBlogPostUseCase {
  constructor(
    private readonly repository: BlogPostRepository,
    private readonly slugChanges: RecordSlugChangeUseCase,
  ) {}

  public async execute(
    tenantId: string,
    id: string,
    input: BlogPostUpdateInput,
  ): Promise<BlogPost> {
    // Se lee antes de actualizar: después ya no se sabe cuál era el slug viejo.
    const previous = await this.repository.findById(tenantId, id);
    const updated = await this.repository.update(tenantId, id, input);

    if (previous !== null) {
      await this.slugChanges.execute(tenantId, BLOG_PREFIX, previous.slug, input.slug);
    }
    return updated;
  }
}

export class DeleteBlogPostUseCase {
  constructor(private readonly repository: BlogPostRepository) {}

  public async execute(tenantId: string, id: string): Promise<void> {
    await this.repository.delete(tenantId, id);
  }
}
