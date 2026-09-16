import { BlogPostRepository } from '../domain/BlogPostRepository';
import { BlogPostIdNotFoundError } from '../domain/BlogPostIdNotFoundError';
import type { BlogPost } from '../domain/BlogPost';
import type { BlogPostInput, BlogPostUpdateInput } from '../domain/BlogPostSchema';

// Los cuatro casos de uso de administración viven juntos porque son una línea cada uno:
// separarlos en cuatro archivos añadiría ceremonia sin añadir claridad.
export class ListAllBlogPostsUseCase {
  constructor(private readonly repository: BlogPostRepository) {}

  public async execute(tenantId: number): Promise<BlogPost[]> {
    return this.repository.findAllByTenant(tenantId);
  }
}

export class GetBlogPostByIdUseCase {
  constructor(private readonly repository: BlogPostRepository) {}

  public async execute(tenantId: number, id: number): Promise<BlogPost> {
    const post = await this.repository.findById(tenantId, id);
    if (post === null) {
      throw new BlogPostIdNotFoundError(id);
    }
    return post;
  }
}

export class CreateBlogPostUseCase {
  constructor(private readonly repository: BlogPostRepository) {}

  public async execute(tenantId: number, input: BlogPostInput): Promise<BlogPost> {
    return this.repository.create(tenantId, input);
  }
}

export class UpdateBlogPostUseCase {
  constructor(private readonly repository: BlogPostRepository) {}

  public async execute(
    tenantId: number,
    id: number,
    input: BlogPostUpdateInput,
  ): Promise<BlogPost> {
    return this.repository.update(tenantId, id, input);
  }
}

export class DeleteBlogPostUseCase {
  constructor(private readonly repository: BlogPostRepository) {}

  public async execute(tenantId: number, id: number): Promise<void> {
    await this.repository.delete(tenantId, id);
  }
}
