import type { Product } from '../domain/Product';
import { effectivePriceCents, formatMoney, hasDiscount } from '../domain/money';
import { buildWhatsAppOrderUrl } from '../domain/whatsAppOrder';

export interface ProductView {
  readonly id: number;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly imageUrls: readonly string[];
  readonly priceCents: number;
  readonly salePriceCents: number | null;
  readonly currency: string;
  readonly price: string;
  readonly salePrice: string | null;
  readonly hasDiscount: boolean;
  readonly variants: readonly { name: string; options: readonly string[] }[];
  readonly categoryId: number | null;
  readonly whatsappOrderUrl: string | null;
}

export type SignKeys = (keys: readonly string[]) => Promise<string[]>;

export interface ProductViewContext {
  readonly whatsappNumber: string;
  readonly siteName: string;
}

// El precio se formatea acá y no en el frontend: es la misma regla para el catálogo, el
// detalle y el mensaje de WhatsApp, y repetirla en tres lugares la deja distinta en dos.
export const toProductView = async (
  product: Product,
  sign: SignKeys,
  context: ProductViewContext,
): Promise<ProductView> => ({
  id: product.id,
  slug: product.slug,
  name: product.name,
  description: product.description,
  imageUrls: await sign(product.imageKeys),
  priceCents: product.priceCents,
  salePriceCents: product.salePriceCents,
  currency: product.currency,
  price: formatMoney(
    effectivePriceCents(product.priceCents, product.salePriceCents),
    product.currency,
  ),
  salePrice:
    product.salePriceCents === null
      ? null
      : formatMoney(product.priceCents, product.currency),
  hasDiscount: hasDiscount(product.priceCents, product.salePriceCents),
  variants: product.variants,
  categoryId: product.categoryId,
  whatsappOrderUrl: buildWhatsAppOrderUrl({
    whatsappNumber: context.whatsappNumber,
    productName: product.name,
    priceCents: product.priceCents,
    salePriceCents: product.salePriceCents,
    currency: product.currency,
    siteName: context.siteName,
  }),
});
