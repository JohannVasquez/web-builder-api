export interface ProductVariant {
  readonly name: string;
  readonly options: readonly string[];
}

export interface ProductPrimitives {
  readonly id: number;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly imageKeys: readonly string[];
  readonly priceCents: number;
  readonly salePriceCents: number | null;
  readonly currency: string;
  readonly categoryId: number | null;
  readonly variants: readonly ProductVariant[];
  readonly isActive: boolean;
  readonly featured: boolean;
  readonly position: number;
  // `null` = la tienda no controla stock de este producto.
  readonly stock: number | null;
  readonly isSoldOut: boolean;
}

export class Product {
  constructor(
    public readonly id: number,
    public readonly slug: string,
    public readonly name: string,
    public readonly description: string,
    public readonly imageKeys: readonly string[],
    public readonly priceCents: number,
    public readonly salePriceCents: number | null,
    public readonly currency: string,
    public readonly categoryId: number | null,
    public readonly variants: readonly ProductVariant[],
    public readonly isActive: boolean,
    public readonly featured: boolean,
    public readonly position: number,
    public readonly stock: number | null = null,
  ) {}

  public isSoldOut(): boolean {
    return this.stock !== null && this.stock <= 0;
  }

  public hasStockFor(quantity: number): boolean {
    return this.stock === null || this.stock >= quantity;
  }

  public unitPriceCents(): number {
    return this.salePriceCents ?? this.priceCents;
  }

  public toPrimitives(): ProductPrimitives {
    return {
      id: this.id,
      slug: this.slug,
      name: this.name,
      description: this.description,
      imageKeys: this.imageKeys,
      priceCents: this.priceCents,
      salePriceCents: this.salePriceCents,
      currency: this.currency,
      categoryId: this.categoryId,
      variants: this.variants,
      isActive: this.isActive,
      featured: this.featured,
      position: this.position,
      stock: this.stock,
      isSoldOut: this.isSoldOut(),
    };
  }
}

export interface ProductCategoryPrimitives {
  readonly id: number;
  readonly slug: string;
  readonly name: string;
  readonly position: number;
}
