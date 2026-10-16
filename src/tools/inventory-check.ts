import { Product } from '../models/product';
import { dbService, localDb } from '../services/database';

export interface InventoryCheckResult {
  found: boolean;
  inStock: boolean;
  quantity: number;
  lowStock: boolean;
  productName?: string;
  sku?: string;
  price?: number;
}

export class InventoryCheckTool {
  public static async check(identifier: string): Promise<InventoryCheckResult> {
    if (dbService.isConnected) {
      try {
        const prod = await Product.findOne({
          $or: [{ sku: identifier }, { name: new RegExp(identifier, 'i') }],
        }).lean();

        if (prod) {
          const qty = prod.inventory?.quantity ?? 0;
          const low = qty <= (prod.inventory?.lowStockThreshold ?? 5);
          return {
            found: true,
            inStock: (prod.inventory?.inStock ?? true) && qty > 0,
            quantity: qty,
            lowStock: low,
            productName: prod.name,
            sku: prod.sku,
            price: prod.price,
          };
        }
      } catch (e) {
        // fall through to local
      }
    }

    const all = Array.from(localDb.products.values());
    const match = all.find(
      (p) =>
        p.sku?.toLowerCase() === identifier.toLowerCase() ||
        p.name?.toLowerCase().includes(identifier.toLowerCase())
    );

    if (match) {
      const qty = match.inventory?.quantity ?? 10;
      return {
        found: true,
        inStock: (match.inventory?.inStock ?? true) && qty > 0,
        quantity: qty,
        lowStock: qty <= (match.inventory?.lowStockThreshold ?? 5),
        productName: match.name,
        sku: match.sku,
        price: match.price,
      };
    }

    return {
      found: false,
      inStock: false,
      quantity: 0,
      lowStock: false,
    };
  }
}
