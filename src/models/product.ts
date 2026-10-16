import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  storeId?: mongoose.Types.ObjectId | string;
  name: string;
  description: string;
  category: string[];
  price: number;
  currency: string;
  sku: string;
  inventory: {
    inStock: boolean;
    quantity: number;
    lowStockThreshold: number;
  };
  attributes?: {
    weight?: string;
    material?: string;
    scent?: string;
    occasion?: string[];
  };
  images?: string[];
  rating: number;
  reviewCount: number;
  tags: string[];
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export const ProductSchema = new Schema<IProduct>(
  {
    storeId: { type: Schema.Types.Mixed, default: 'store_priya_001' },
    name: { type: String, required: true, index: true },
    description: { type: String, required: true },
    category: { type: [String], default: [], index: true },
    price: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    sku: { type: String, required: true, unique: true },
    inventory: {
      inStock: { type: Boolean, default: true },
      quantity: { type: Number, default: 0 },
      lowStockThreshold: { type: Number, default: 5 },
    },
    attributes: {
      weight: { type: String },
      material: { type: String },
      scent: { type: String },
      occasion: { type: [String], default: [] },
    },
    images: { type: [String], default: [] },
    rating: { type: Number, default: 5.0 },
    reviewCount: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);

export const Product: mongoose.Model<IProduct> =
  (mongoose.models.Product as any) || mongoose.model<IProduct>('Product', ProductSchema);
