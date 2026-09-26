import type { Request, Response } from 'express';
import { z } from 'zod';
import type {
  CreateProductUseCase,
  DeleteProductUseCase,
  ListAllProductsUseCase,
  UpdateProductUseCase,
} from '../application/StoreUseCases';
import { ProductRepository } from '../domain/ProductRepository';
import {
  ProductInputSchema,
  ProductUpdateSchema,
  CategoryInputSchema,
  CategoryUpdateSchema,
} from '../domain/ProductSchema';
import { ProductNotFoundError } from '../domain/ProductNotFoundError';
import { idSchema } from '@/shared/domain/identifier';

const tenantParams = z.object({ tenantId: idSchema });
const productParams = tenantParams.extend({
  productId: idSchema,
});
const categoryParams = tenantParams.extend({
  categoryId: idSchema,
});

export class AdminStoreController {
  constructor(
    private readonly listAllProductsUseCase: ListAllProductsUseCase,
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
    private readonly repository: ProductRepository,
  ) {}

  public readonly list = async (req: Request, res: Response): Promise<void> => {
    const { tenantId } = tenantParams.parse(req.params);
    const products = await this.listAllProductsUseCase.execute(tenantId);
    res.json({ products: products.map((product) => product.toPrimitives()) });
  };

  public readonly get = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, productId } = productParams.parse(req.params);
    const product = await this.repository.findById(tenantId, productId);
    if (product === null) {
      throw new ProductNotFoundError(productId);
    }
    res.json({ product: product.toPrimitives() });
  };

  public readonly create = async (req: Request, res: Response): Promise<void> => {
    const { tenantId } = tenantParams.parse(req.params);
    const input = ProductInputSchema.parse(req.body);
    const product = await this.createProductUseCase.execute(tenantId, input);
    res.status(201).json({ product: product.toPrimitives() });
  };

  public readonly update = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, productId } = productParams.parse(req.params);
    const input = ProductUpdateSchema.parse(req.body);
    const product = await this.updateProductUseCase.execute(tenantId, productId, input);
    res.json({ product: product.toPrimitives() });
  };

  public readonly remove = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, productId } = productParams.parse(req.params);
    await this.deleteProductUseCase.execute(tenantId, productId);
    res.status(204).send();
  };

  public readonly listCategories = async (req: Request, res: Response): Promise<void> => {
    const { tenantId } = tenantParams.parse(req.params);
    res.json({ categories: await this.repository.listCategories(tenantId) });
  };

  public readonly createCategory = async (req: Request, res: Response): Promise<void> => {
    const { tenantId } = tenantParams.parse(req.params);
    const input = CategoryInputSchema.parse(req.body);
    res
      .status(201)
      .json({ category: await this.repository.createCategory(tenantId, input) });
  };

  public readonly updateCategory = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, categoryId } = categoryParams.parse(req.params);
    const input = CategoryUpdateSchema.parse(req.body);
    res.json({
      category: await this.repository.updateCategory(tenantId, categoryId, input),
    });
  };

  public readonly removeCategory = async (req: Request, res: Response): Promise<void> => {
    const { tenantId, categoryId } = categoryParams.parse(req.params);
    await this.repository.deleteCategory(tenantId, categoryId);
    res.status(204).send();
  };
}
