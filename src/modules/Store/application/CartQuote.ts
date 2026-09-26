import type { CartTotals, PricedLine } from '../domain/cartPricing';
import type { ShippingOption } from '../domain/StoreSettings';

export interface CartQuote {
  readonly lines: readonly PricedLine[];
  readonly totals: CartTotals;
  readonly currency: string;
  readonly coupon: { readonly code: string; readonly discountCents: number } | null;
  readonly couponRejection: string | null;
  readonly shipping: ShippingOption | null;
  readonly availableShipping: readonly ShippingOption[];
  readonly taxIncluded: boolean;
  readonly taxRatePercent: number;
}
