import type { PrismaClient } from '../../../shared/infrastructure/prisma/generated/client';
import {
  Product,
  type ProductCategoryPrimitives,
  type ProductVariant,
} from '../domain/Product';
import type { CatalogQuery, ProductRepository } from '../domain/ProductRepository';
import type {
  CategoryInput,
  CategoryUpdateInput,
  ProductInput,
  ProductUpdateInput,
} from '../domain/ProductSchema';
import { ProductNotFoundError } from '../domain/ProductNotFoundError';
import { ProductSlugConflictError } from '../domain/ProductSlugConflictError';
import { InvalidSalePriceError } from '../domain/InvalidSalePriceError';

interface ProductRecord {
  readonly id: number;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly imageKeys: string[];
  readonly priceCents: number;
  readonly salePriceCents: number | null;
  readonly currency: string;
  readonly categoryId: number | null;
  readonly variants: unknown;
  readonly isActive: boolean;
  readonly featured: boolean;
  readonly position: number;
  readonly stock: number | null;
}

const asJsonColumn = (value: unknown): object => value as object;

// Un `variants` roto en la base no puede tumbar el catálogo entero: se degrada a vacío.
const toVariants = (value: unknown): ProductVariant[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return (value as unknown[]).filter(
    (item): item is ProductVariant =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as ProductVariant).name === 'string' &&
      Array.isArray((item as ProductVariant).options),
  );
};

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async listActive(
    tenantId: number,
    query: CatalogQuery,
  ): Promise<{ products: Product[]; total: number }> {
    const where = {
      tenantId,
      isActive: true,
      ...(query.search === undefined || query.search === ''
        ? {}
        : { name: { contains: query.search, mode: 'insensitive' as const } }),
      ...(query.categorySlug === undefined
        ? {}
        : { category: { slug: query.categorySlug } }),
    };

    const [records, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        take: query.perPage,
        skip: (query.page - 1) * query.perPage,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { products: records.map((record) => this.toDomain(record)), total };
  }

  public async findActiveBySlug(tenantId: number, slug: string): Promise<Product | null> {
    const record = await this.prisma.product.findFirst({
      where: { tenantId, slug, isActive: true },
    });
    return record === null ? null : this.toDomain(record);
  }

  public async listFeatured(tenantId: number, limit: number): Promise<Product[]> {
    const records = await this.prisma.product.findMany({
      where: { tenantId, isActive: true, featured: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      take: limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  public async listCategories(tenantId: number): Promise<ProductCategoryPrimitives[]> {
    const records = await this.prisma.productCategory.findMany({
      where: { tenantId },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
    return records.map((record) => ({
      id: record.id,
      slug: record.slug,
      name: record.name,
      position: record.position,
    }));
  }

  public async findAllByTenant(tenantId: number): Promise<Product[]> {
    const records = await this.prisma.product.findMany({
      where: { tenantId },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
    return records.map((record) => this.toDomain(record));
  }

  public async findById(tenantId: number, id: number): Promise<Product | null> {
    const record = await this.prisma.product.findFirst({ where: { tenantId, id } });
    return record === null ? null : this.toDomain(record);
  }

  public async create(tenantId: number, input: ProductInput): Promise<Product> {
    await this.ensureSlugIsFree(tenantId, input.slug, null);
    const record = await this.prisma.product.create({
      data: { tenantId, ...input, variants: asJsonColumn(input.variants) },
    });
    return this.toDomain(record);
  }

  public async update(
    tenantId: number,
    id: number,
    input: ProductUpdateInput,
  ): Promise<Product> {
    const existing = await this.findById(tenantId, id);
    if (existing === null) {
      throw new ProductNotFoundError(id);
    }
    if (input.slug !== undefined) {
      await this.ensureSlugIsFree(tenantId, input.slug, id);
    }
    // El precio de oferta se valida contra el precio que va a quedar, no contra el enviado:
    // bajar solo el precio normal podría dejar una oferta más cara que él.
    const nextPrice = input.priceCents ?? existing.priceCents;
    const nextSale =
      input.salePriceCents === undefined ? existing.salePriceCents : input.salePriceCents;
    if (nextSale !== null && nextSale >= nextPrice) {
      throw new InvalidSalePriceError();
    }

    const record = await this.prisma.product.update({
      where: { id },
      data: {
        ...input,
        ...(input.variants === undefined
          ? {}
          : { variants: asJsonColumn(input.variants) }),
      },
    });
    return this.toDomain(record);
  }

  public async delete(tenantId: number, id: number): Promise<void> {
    await this.prisma.product.deleteMany({ where: { tenantId, id } });
  }

  public async createCategory(
    tenantId: number,
    input: CategoryInput,
  ): Promise<ProductCategoryPrimitives> {
    const record = await this.prisma.productCategory.create({
      data: { tenantId, ...input },
    });
    return {
      id: record.id,
      slug: record.slug,
      name: record.name,
      position: record.position,
    };
  }

  public async updateCategory(
    tenantId: number,
    id: number,
    input: CategoryUpdateInput,
  ): Promise<ProductCategoryPrimitives> {
    const existing = await this.prisma.productCategory.findFirst({
      where: { tenantId, id },
    });
    if (existing === null) {
      throw new ProductNotFoundError(id);
    }
    const record = await this.prisma.productCategory.update({
      where: { id },
      data: input,
    });
    return {
      id: record.id,
      slug: record.slug,
      name: record.name,
      position: record.position,
    };
  }

  public async deleteCategory(tenantId: number, id: number): Promise<void> {
    await this.prisma.productCategory.deleteMany({ where: { tenantId, id } });
  }

  // El mismo slug en otro cliente es válido: los catálogos son independientes.
  private async ensureSlugIsFree(
    tenantId: number,
    slug: string,
    exceptId: number | null,
  ): Promise<void> {
    const clash = await this.prisma.product.findFirst({
      where: { tenantId, slug, ...(exceptId === null ? {} : { id: { not: exceptId } }) },
      select: { id: true },
    });
    if (clash !== null) {
      throw new ProductSlugConflictError(slug);
    }
  }

  private toDomain(record: ProductRecord): Product {
    return new Product(
      record.id,
      record.slug,
      record.name,
      record.description,
      record.imageKeys,
      record.priceCents,
      record.salePriceCents,
      record.currency,
      record.categoryId,
      toVariants(record.variants),
      record.isActive,
      record.featured,
      record.position,
      record.stock,
    );
  }
}
