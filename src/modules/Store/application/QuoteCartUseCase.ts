import { CheckoutRejectedError } from '../domain/CheckoutRejectedError';
import { StoreDisabledError } from '../domain/StoreDisabledError';
import { calculateTotals, type PricedLine } from '../domain/cartPricing';
import type { CartInput } from '../domain/Order';
import type { CouponRepository } from '../domain/CouponRepository';
import type { ProductRepository } from '../domain/ProductRepository';
import type { StoreSettings } from '../domain/StoreSettings';
import type { StoreSettingsRepository } from '../domain/StoreSettingsRepository';
import type { CartQuote } from './CartQuote';

export class QuoteCartUseCase {
  constructor(
    private readonly storeSettingsRepository: StoreSettingsRepository,
    private readonly productRepository: ProductRepository,
    private readonly couponRepository: CouponRepository,
  ) {}

  public async execute(
    tenantId: string,
    input: CartInput,
    now = new Date(),
  ): Promise<CartQuote> {
    const settings = await this.storeSettingsRepository.find(tenantId);
    if (!settings.isEnabled) {
      throw new StoreDisabledError();
    }

    const lines = await this.priceLines(tenantId, input);
    const subtotalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
    const { coupon, couponRejection } = await this.resolveCoupon(
      tenantId,
      input.couponCode,
      subtotalCents,
      now,
    );

    const shipping =
      input.shippingCode === null ? null : settings.shippingOption(input.shippingCode);
    if (input.shippingCode !== null && shipping === null) {
      throw new CheckoutRejectedError('Esa forma de envío ya no está disponible.');
    }

    const totals = calculateTotals({
      lines,
      discountCents: coupon?.discountCents ?? 0,
      shipping,
      freeShippingThresholdCents: settings.freeShippingThresholdCents,
      taxIncluded: settings.taxIncluded,
      taxRatePercent: settings.taxRatePercent,
    });

    return {
      lines,
      totals,
      currency: settings.currency,
      coupon,
      couponRejection,
      shipping,
      availableShipping: settings.shippingOptions,
      taxIncluded: settings.taxIncluded,
      taxRatePercent: settings.taxRatePercent,
    };
  }

  public async settingsFor(tenantId: string): Promise<StoreSettings> {
    return this.storeSettingsRepository.find(tenantId);
  }

  // Los precios salen SIEMPRE de la base, nunca del carrito que manda el navegador:
  // si no, cualquiera compraría a un peso cambiando el cuerpo de la petición.
  private async priceLines(tenantId: string, input: CartInput): Promise<PricedLine[]> {
    const lines: PricedLine[] = [];

    for (const item of input.items) {
      const product = await this.productRepository.findById(tenantId, item.productId);
      if (product === null || !product.isActive) {
        throw new CheckoutRejectedError(
          'Uno de los productos de tu carrito ya no está disponible.',
        );
      }
      if (!product.hasStockFor(item.quantity)) {
        throw new CheckoutRejectedError(
          product.isSoldOut()
            ? `"${product.name}" se agotó.`
            : `Solo quedan ${String(product.stock)} unidades de "${product.name}".`,
        );
      }

      const unitPriceCents = product.unitPriceCents();
      lines.push({
        productId: product.id,
        name: product.name,
        variant: item.variant,
        unitPriceCents,
        quantity: item.quantity,
        totalCents: unitPriceCents * item.quantity,
      });
    }

    return lines;
  }

  // Un cupón que no sirve no rompe la cotización: se informa el motivo y se cobra sin él,
  // porque quien compra tiene que poder seguir aunque se haya equivocado de código.
  private async resolveCoupon(
    tenantId: string,
    code: string | null,
    subtotalCents: number,
    now: Date,
  ): Promise<{
    coupon: { code: string; discountCents: number } | null;
    couponRejection: string | null;
  }> {
    if (code === null || code === '') {
      return { coupon: null, couponRejection: null };
    }

    const coupon = await this.couponRepository.findByCode(tenantId, code.toUpperCase());
    if (coupon === null) {
      return { coupon: null, couponRejection: 'Ese cupón no existe.' };
    }

    const rejection = coupon.rejectionFor(subtotalCents, now);
    if (rejection !== null) {
      return { coupon: null, couponRejection: rejection };
    }

    return {
      coupon: { code: coupon.code, discountCents: coupon.discountFor(subtotalCents) },
      couponRejection: null,
    };
  }
}
