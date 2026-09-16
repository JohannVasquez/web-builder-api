import type { Product, ProductCategoryPrimitives } from './Product';
import type {
  CategoryInput,
  CategoryUpdateInput,
  ProductInput,
  ProductUpdateInput,
} from './ProductSchema';

export interface CatalogQuery {
  readonly search?: string;
  readonly categorySlug?: string;
  readonly page: number;
  readonly perPage: number;
}

// Clase abstracta usada como token de inyección de dependencias (diod).
export abstract class ProductRepository {
  // Público: solo productos activos. Un inactivo no existe para el visitante.
  public abstract listActive(
    tenantId: number,
    query: CatalogQuery,
  ): Promise<{ products: Product[]; total: number }>;
  public abstract findActiveBySlug(
    tenantId: number,
    slug: string,
  ): Promise<Product | null>;
  public abstract listFeatured(tenantId: number, limit: number): Promise<Product[]>;
  public abstract listCategories(tenantId: number): Promise<ProductCategoryPrimitives[]>;

  // Admin: incluye inactivos, todo scoped por tenant.
  public abstract findAllByTenant(tenantId: number): Promise<Product[]>;
  public abstract findById(tenantId: number, id: number): Promise<Product | null>;
  public abstract create(tenantId: number, input: ProductInput): Promise<Product>;
  public abstract update(
    tenantId: number,
    id: number,
    input: ProductUpdateInput,
  ): Promise<Product>;
  public abstract delete(tenantId: number, id: number): Promise<void>;

  public abstract createCategory(
    tenantId: number,
    input: CategoryInput,
  ): Promise<ProductCategoryPrimitives>;
  public abstract updateCategory(
    tenantId: number,
    id: number,
    input: CategoryUpdateInput,
  ): Promise<ProductCategoryPrimitives>;
  public abstract deleteCategory(tenantId: number, id: number): Promise<void>;
}
