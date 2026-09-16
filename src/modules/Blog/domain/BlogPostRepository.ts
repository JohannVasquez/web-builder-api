import type { BlogPost } from './BlogPost';
import type { BlogPostInput, BlogPostUpdateInput } from './BlogPostSchema';

export interface ListVisibleBlogPostsOptions {
  readonly page: number;
  readonly perPage: number;
  readonly tag?: string;
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class BlogPostRepository {
  // Público: `now` decide la regla de visibilidad (AC1 de la épica), inyectado para poder
  // testear "programada con fecha pasada" sin depender del reloj real.
  public abstract findVisibleBySlug(
    tenantId: number,
    slug: string,
    now: Date,
  ): Promise<BlogPost | null>;
  public abstract listVisible(
    tenantId: number,
    options: ListVisibleBlogPostsOptions,
    now: Date,
  ): Promise<{ posts: BlogPost[]; total: number }>;
  public abstract listRelatedVisible(
    tenantId: number,
    excludePostId: number,
    tags: readonly string[],
    now: Date,
    limit: number,
  ): Promise<BlogPost[]>;

  // Admin: todo scoped por `tenantId`, para que un id adivinado nunca cruce hacia otro cliente.
  public abstract findAllByTenant(tenantId: number): Promise<BlogPost[]>;
  public abstract findById(tenantId: number, id: number): Promise<BlogPost | null>;
  public abstract create(tenantId: number, input: BlogPostInput): Promise<BlogPost>;
  public abstract update(
    tenantId: number,
    id: number,
    input: BlogPostUpdateInput,
  ): Promise<BlogPost>;
  public abstract delete(tenantId: number, id: number): Promise<void>;
}
