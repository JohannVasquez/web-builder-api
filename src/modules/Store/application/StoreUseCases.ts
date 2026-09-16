import { ProductRepository, type CatalogQuery } from '../domain/ProductRepository';
import { GlobalSettingsRepository } from '../../GlobalSettings/domain/GlobalSettingsRepository';
import { StorageProvider } from '../../FileStorage/domain/StorageProvider';
import { ProductNotFoundError } from '../domain/ProductNotFoundError';
import { toProductView, type ProductView, type ProductViewContext } from './ProductView';
import type { Product, ProductCategoryPrimitives } from '../domain/Product';
import type { ProductInput, ProductUpdateInput } from '../domain/ProductSchema';

const ABSOLUTE_URL = /^https?:\/\//;

// Las tres consultas públicas comparten el mismo trabajo: firmar imágenes y leer el
// WhatsApp del cliente. Vive una sola vez acá.
export class PublicCatalogUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly settings: GlobalSettingsRepository,
    private readonly storage: StorageProvider,
  ) {}

  public async list(
    tenantId: number,
    query: CatalogQuery,
  ): Promise<{ products: ProductView[]; total: number; page: number; perPage: number }> {
    const [{ products, total }, context] = await Promise.all([
      this.products.listActive(tenantId, query),
      this.contextOf(tenantId),
    ]);
    return {
      products: await this.viewAll(products, context),
      total,
      page: query.page,
      perPage: query.perPage,
    };
  }

  public async get(tenantId: number, slug: string): Promise<ProductView> {
    const product = await this.products.findActiveBySlug(tenantId, slug);
    if (product === null) {
      throw new ProductNotFoundError(slug);
    }
    const [view] = await this.viewAll([product], await this.contextOf(tenantId));
    if (view === undefined) {
      throw new ProductNotFoundError(slug);
    }
    return view;
  }

  public async featured(tenantId: number, limit: number): Promise<ProductView[]> {
    const [products, context] = await Promise.all([
      this.products.listFeatured(tenantId, limit),
      this.contextOf(tenantId),
    ]);
    return this.viewAll(products, context);
  }

  public async categories(tenantId: number): Promise<ProductCategoryPrimitives[]> {
    return this.products.listCategories(tenantId);
  }

  private async contextOf(tenantId: number): Promise<ProductViewContext> {
    const settings = await this.settings.find(tenantId);
    return {
      whatsappNumber: settings.get('whatsappNumber'),
      siteName: settings.get('siteName'),
    };
  }

  private viewAll(
    products: readonly Product[],
    context: ProductViewContext,
  ): Promise<ProductView[]> {
    return Promise.all(
      products.map((product) =>
        toProductView(product, (keys) => this.signKeys(keys), context),
      ),
    );
  }

  private signKeys(keys: readonly string[]): Promise<string[]> {
    return Promise.all(
      keys.map((key) =>
        key === '' || ABSOLUTE_URL.test(key)
          ? Promise.resolve(key)
          : this.storage.getPresignedUrl(key),
      ),
    );
  }
}

export class ListAllProductsUseCase {
  constructor(private readonly repository: ProductRepository) {}

  public async execute(tenantId: number): Promise<Product[]> {
    return this.repository.findAllByTenant(tenantId);
  }
}

export class CreateProductUseCase {
  constructor(private readonly repository: ProductRepository) {}

  public async execute(tenantId: number, input: ProductInput): Promise<Product> {
    return this.repository.create(tenantId, input);
  }
}

export class UpdateProductUseCase {
  constructor(private readonly repository: ProductRepository) {}

  public async execute(
    tenantId: number,
    id: number,
    input: ProductUpdateInput,
  ): Promise<Product> {
    return this.repository.update(tenantId, id, input);
  }
}

export class DeleteProductUseCase {
  constructor(private readonly repository: ProductRepository) {}

  public async execute(tenantId: number, id: number): Promise<void> {
    await this.repository.delete(tenantId, id);
  }
}
