import type { Request, Response } from 'express';
import { z } from 'zod';
import type {
  CreateBlogPostUseCase,
  DeleteBlogPostUseCase,
  GetBlogPostByIdUseCase,
  ListAllBlogPostsUseCase,
  UpdateBlogPostUseCase,
} from '../application/AdminBlogUseCases';
import { BlogPostInputSchema, BlogPostUpdateSchema } from '../domain/BlogPostSchema';

const tenantParams = z.object({ tenantId: z.coerce.number().int().positive() });
const postParams = tenantParams.extend({
  postId: z.coerce.number().int().positive(),
});

export class AdminBlogController {
  constructor(
    private readonly listAllBlogPostsUseCase: ListAllBlogPostsUseCase,
    private readonly getBlogPostByIdUseCase: GetBlogPostByIdUseCase,
    private readonly createBlogPostUseCase: CreateBlogPostUseCase,
    private readonly updateBlogPostUseCase: UpdateBlogPostUseCase,
    private readonly deleteBlogPostUseCase: DeleteBlogPostUseCase,
  ) {}

  public readonly list = async (req: Request, res: Response): Promise<void> => {
    const { tenantId } = tenantParams.parse(req.params);
    const posts = await this.listAllBlogPostsUseCase.execute(tenantId);
    res.json({ posts: posts.map((post) => post.toPrimitives()) });
  };

  public readonly get = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, postId } = postParams.parse(req.params);
    const post = await this.getBlogPostByIdUseCase.execute(tenantId, postId);
    res.json({ post: post.toPrimitives() });
  };

  public readonly create = async (req: Request, res: Response): Promise<void> => {
    const { tenantId } = tenantParams.parse(req.params);
    const input = BlogPostInputSchema.parse(req.body);
    const post = await this.createBlogPostUseCase.execute(tenantId, input);
    res.status(201).json({ post: post.toPrimitives() });
  };

  public readonly update = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, postId } = postParams.parse(req.params);
    const input = BlogPostUpdateSchema.parse(req.body);
    const post = await this.updateBlogPostUseCase.execute(tenantId, postId, input);
    res.json({ post: post.toPrimitives() });
  };

  public readonly remove = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, postId } = postParams.parse(req.params);
    await this.deleteBlogPostUseCase.execute(tenantId, postId);
    res.status(204).send();
  };
}
