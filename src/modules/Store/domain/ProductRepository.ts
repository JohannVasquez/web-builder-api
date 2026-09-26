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
    tenantId: string,
    query: CatalogQuery,
  ): Promise<{ products: Product[]; total: number }>;
  public abstract findActiveBySlug(
    tenantId: string,
    slug: string,
  ): Promise<Product | null>;
  public abstract listFeatured(tenantId: string, limit: number): Promise<Product[]>;
  public abstract listCategories(tenantId: string): Promise<ProductCategoryPrimitives[]>;

  // Admin: incluye inactivos, todo scoped por tenant.
  public abstract findAllByTenant(tenantId: string): Promise<Product[]>;
  public abstract findById(tenantId: string, id: string): Promise<Product | null>;
  public abstract create(tenantId: string, input: ProductInput): Promise<Product>;
  public abstract update(
    tenantId: string,
    id: string,
    input: ProductUpdateInput,
  ): Promise<Product>;
  public abstract delete(tenantId: string, id: string): Promise<void>;

  public abstract createCategory(
    tenantId: string,
    input: CategoryInput,
  ): Promise<ProductCategoryPrimitives>;
  public abstract updateCategory(
    tenantId: string,
    id: string,
    input: CategoryUpdateInput,
  ): Promise<ProductCategoryPrimitives>;
  public abstract deleteCategory(tenantId: string, id: string): Promise<void>;
}
