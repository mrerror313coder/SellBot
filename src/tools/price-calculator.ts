export interface CartItem {
  productId?: string;
  sku?: string;
  name: string;
  quantity: number;
  price: number;
}

export interface PriceCalculationResult {
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountPercent: number;
  shipping: number;
  total: number;
  currency: string;
  freeShippingQualified: boolean;
  amountNeededForFreeShipping: number;
  upsellSuggestion?: string;
}

export class PriceCalculatorTool {
  public static calculate(
    items: CartItem[],
    discountCode?: string,
    freeShippingThreshold: number = 1000,
    currency: string = 'INR'
  ): PriceCalculationResult {
    const subtotal = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

    let discountPercent = 0;
    if (discountCode) {
      const code = discountCode.toUpperCase();
      if (code === 'WELCOME10' || code === 'FIRST10' || code === 'HACK10') {
        discountPercent = 10;
      } else if (code === 'SWEET20' || code === 'FESTIVE20') {
        discountPercent = 20;
      }
    }

    const discount = Math.round((subtotal * discountPercent) / 100);
    const afterDiscount = subtotal - discount;

    const freeShippingQualified = afterDiscount >= freeShippingThreshold || subtotal === 0;
    const shipping = freeShippingQualified ? 0 : 50;
    const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - afterDiscount);

    const total = afterDiscount + shipping;

    let upsellSuggestion: string | undefined;
    if (!freeShippingQualified && amountNeededForFreeShipping <= 300) {
      upsellSuggestion = `Add an artisan brownie or candle (₹${amountNeededForFreeShipping} more) to unlock FREE delivery! 🚚✨`;
    }

    return {
      items,
      subtotal,
      discount,
      discountPercent,
      shipping,
      total,
      currency,
      freeShippingQualified,
      amountNeededForFreeShipping,
      upsellSuggestion,
    };
  }
}
