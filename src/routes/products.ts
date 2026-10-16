import { Router, Request, Response } from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { Product } from '../models/product';
import { dbService, localDb } from '../services/database';
import { aiService } from '../services/ai';

export const productsRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /api/products
 * List products with search and filters
 */
productsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, category, inStock } = req.query;

    if (dbService.isConnected) {
      const filter: any = {};
      if (category) filter.category = category;
      if (inStock === 'true') filter['inventory.inStock'] = true;
      if (search) {
        filter.$or = [
          { name: new RegExp(String(search), 'i') },
          { description: new RegExp(String(search), 'i') },
          { sku: new RegExp(String(search), 'i') },
        ];
      }
      const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
      res.json(products);
      return;
    }

    // Local DB fallback
    let items = Array.from(localDb.products.values());
    if (category) {
      items = items.filter((p) => p.category?.includes(category));
    }
    if (inStock === 'true') {
      items = items.filter((p) => p.inventory?.inStock);
    }
    if (search) {
      const s = String(search).toLowerCase();
      items = items.filter(
        (p) =>
          p.name?.toLowerCase().includes(s) ||
          p.description?.toLowerCase().includes(s) ||
          p.sku?.toLowerCase().includes(s)
      );
    }
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
});

/**
 * POST /api/products
 * Add product manually
 */
productsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data.name || !data.price || !data.sku) {
      res.status(400).json({ error: 'Name, price, and SKU are required' });
      return;
    }

    // Generate embedding
    const embedding = await aiService.generateEmbedding(`${data.name} ${data.description || ''} ${data.tags?.join(' ') || ''}`);
    const productObj = {
      ...data,
      embedding,
      inventory: data.inventory || {
        inStock: true,
        quantity: data.quantity || 15,
        lowStockThreshold: 5,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (dbService.isConnected) {
      const created = await Product.create(productObj);
      res.status(201).json(created);
      return;
    }

    const id = `prod_${Date.now()}`;
    const saved = { _id: id, ...productObj };
    localDb.products.set(data.sku, saved);
    dbService.saveLocalBackup();
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create product', details: err.message });
  }
});

/**
 * POST /api/stores/:storeId/products/upload
 * CSV upload as specified in Section 13.1 of PRD
 */
productsRouter.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    let csvBuffer: Buffer | undefined;

    if (req.file) {
      csvBuffer = req.file.buffer;
    } else if (req.body?.csvContent) {
      csvBuffer = Buffer.from(req.body.csvContent, 'utf-8');
    }

    if (!csvBuffer) {
      res.status(400).json({ error: 'No CSV file or csvContent provided' });
      return;
    }

    const rows: any[] = [];
    const stream = Readable.from(csvBuffer.toString('utf-8'));

    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    let uploaded = 0;
    let embeddingsGenerated = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const name = row.name || row.Name;
        const description = row.description || row.Description || name;
        const price = parseFloat(row.price || row.Price || '0');
        const sku = row.sku || row.SKU || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const quantity = parseInt(row.quantity || row.Quantity || '10', 10);
        const rating = parseFloat(row.rating || row.Rating || '4.8');
        const category = (row.category || row.Category || 'general')
          .split(',')
          .map((c: string) => c.trim().toLowerCase());
        const tags = (row.tags || row.Tags || '')
          .split(',')
          .map((t: string) => t.trim().toLowerCase())
          .filter(Boolean);

        if (!name || isNaN(price)) {
          errors++;
          continue;
        }

        const embedding = await aiService.generateEmbedding(`${name} ${description} ${tags.join(' ')} ${category.join(' ')}`);
        embeddingsGenerated++;

        const productDoc = {
          name,
          description,
          price,
          currency: 'INR',
          sku,
          category,
          tags,
          rating,
          reviewCount: 25,
          inventory: {
            inStock: quantity > 0,
            quantity,
            lowStockThreshold: 5,
          },
          attributes: {
            weight: row.weight || '500g',
            material: row.material || 'Artisan handcrafted',
            occasion: row.occasion ? row.occasion.split(',') : ['celebration'],
          },
          images: [`https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400`],
          embedding,
          updatedAt: new Date(),
        };

        if (dbService.isConnected) {
          await Product.findOneAndUpdate({ sku }, { $set: productDoc }, { upsert: true });
        } else {
          localDb.products.set(sku, { _id: sku, ...productDoc });
        }
        uploaded++;
      } catch (e) {
        errors++;
      }
    }

    if (!dbService.isConnected) {
      dbService.saveLocalBackup();
    }

    res.status(200).json({
      uploaded,
      embeddingsGenerated,
      errors,
      message: `Successfully processed ${uploaded} products with 768-dim vector embeddings.`,
    });
  } catch (err: any) {
    console.error('Error in CSV upload:', err);
    res.status(500).json({ error: 'Failed to process CSV file', details: err.message });
  }
});
