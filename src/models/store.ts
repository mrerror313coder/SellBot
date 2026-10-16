import mongoose, { Schema, Document } from 'mongoose';

export interface IStore extends Document {
  storeId: string;
  name: string;
  owner: string;
  channels: {
    whatsapp: {
      enabled: boolean;
      number?: string;
    };
  };
  settings: {
    agentPersonality: string;
    languages: string[];
    currency: string;
    upsellAggressiveness: number;
    paymentUPI: string;
    lowStockAlert: number;
    freeShippingThreshold: number;
  };
  subscription: {
    plan: 'free' | 'starter' | 'pro' | 'enterprise';
    conversationsUsed: number;
    conversationsLimit: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export const StoreSchema = new Schema<IStore>(
  {
    storeId: { type: String, required: true, unique: true, default: 'store_priya_001' },
    name: { type: String, required: true, default: "Priya's Cakes" },
    owner: { type: String, default: 'priya@email.com' },
    channels: {
      whatsapp: {
        enabled: { type: Boolean, default: true },
        number: { type: String, default: '919876543210' },
      },
    },
    settings: {
      agentPersonality: {
        type: String,
        default: 'warm, friendly, uses emojis, helpful pastry and gift consultant',
      },
      languages: { type: [String], default: ['en', 'hi', 'hi-en', 'es', 'ar', 'pt'] },
      currency: { type: String, default: 'INR' },
      upsellAggressiveness: { type: Number, default: 0.5 },
      paymentUPI: { type: String, default: 'priya@paytm' },
      lowStockAlert: { type: Number, default: 5 },
      freeShippingThreshold: { type: Number, default: 1000 },
    },
    subscription: {
      plan: { type: String, default: 'free' },
      conversationsUsed: { type: Number, default: 0 },
      conversationsLimit: { type: Number, default: 500 },
    },
  },
  { timestamps: true }
);

export const Store: mongoose.Model<IStore> =
  (mongoose.models.Store as any) || mongoose.model<IStore>('Store', StoreSchema);
