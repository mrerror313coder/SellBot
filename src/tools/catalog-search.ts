import { Product, IProduct } from '../models/product';
import { dbService, localDb } from '../services/database';
import { aiService } from '../services/ai';

export interface CatalogSearchParams {
  query: string;
  storeId?: string;
  budget?: number;
  category?: string;
  limit?: number;
  inStockOnly?: boolean;
}

export interface CatalogSearchResult {
  product: any;
  score: number;
  matchReason: string;
}

export class CatalogSearchTool {
  public static async search(params: CatalogSearchParams): Promise<CatalogSearchResult[]> {
    const { query, budget, category, limit = 5, inStockOnly = true } = params;
    const queryVector = await aiService.generateEmbedding(query);
    const results: CatalogSearchResult[] = [];

    // 1. If MongoDB Atlas connected, attempt Atlas Vector Search or query
    if (dbService.isConnected) {
      try {
        // Attempt Atlas Vector aggregation pipeline
        const pipeline: any[] = [
          {
            $search: {
              index: 'product_semantic_search',
              knnBeta: {
                vector: queryVector,
                path: 'embedding',
                k: limit * 2,
              },
            },
          },
        ];

        if (budget) {
          pipeline.push({ $match: { price: { $lte: budget * 1.15 } } });
        }
        if (inStockOnly) {
          pipeline.push({ $match: { 'inventory.inStock': true } });
        }

        const mongoResults = await Product.aggregate(pipeline).exec();
        if (mongoResults && mongoResults.length > 0) {
          return mongoResults.slice(0, limit).map((p: any) => ({
            product: p,
            score: 0.95,
            matchReason: 'Atlas Vector Search exact match',
          }));
        }
      } catch (err) {
        // Atlas vector index may not be initialized yet; fallback to standard Mongo query + local cosine
        const filter: any = {};
        if (budget) filter.price = { $lte: budget * 1.2 };
        if (inStockOnly) filter['inventory.inStock'] = true;
        const products = await Product.find(filter).lean();
        return this.rankProductsLocally(products, query, queryVector, budget, limit);
      }
    }

    // 2. Local database fallback
    const allProducts = Array.from(localDb.products.values());
    return this.rankProductsLocally(allProducts, query, queryVector, budget, limit);
  }

  private static rankProductsLocally(
    products: any[],
    query: string,
    queryVector: number[],
    budget?: number,
    limit: number = 5
  ): CatalogSearchResult[] {
    const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

    const scored = products
      .map((p) => {
        // Vector cosine similarity
        let vScore = 0;
        if (p.embedding && p.embedding.length > 0) {
          vScore = aiService.cosineSimilarity(queryVector, p.embedding);
        }

        // Keyword text matching
        const textToSearch = `${p.name} ${p.description} ${p.tags?.join(' ') || ''} ${p.category?.join(' ') || ''}`.toLowerCase();
        let keywordScore = 0;
        for (const t of terms) {
          if (textToSearch.includes(t)) keywordScore += 0.25;
        }

        // Budget fit bonus
        let budgetScore = 0;
        if (budget && p.price) {
          if (p.price <= budget) {
            budgetScore = 0.2; // directly fits
          } else if (p.price <= budget * 1.15) {
            budgetScore = 0.05; // close stretch
          } else {
            budgetScore = -0.3; // over budget penalty
          }
        }

        const totalScore = Math.max(0, vScore * 0.6 + keywordScore * 0.3 + budgetScore * 0.1);

        let matchReason = 'Relevant to your query';
        if (budget && p.price <= budget) {
          matchReason = `Fits your budget of ₹${budget} (priced at ₹${p.price})`;
        } else if (p.rating >= 4.8) {
          matchReason = `Top customer favorite (${p.rating} ⭐)`;
        }

        return {
          product: p,
          score: parseFloat(totalScore.toFixed(3)),
          matchReason,
        };
      })
      .filter((item) => (paramsBudgetFilter(item.product, budget)))
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  }
}

function paramsBudgetFilter(prod: any, budget?: number): boolean {
  if (!budget) return true;
  return prod.price <= budget * 1.3;
}
