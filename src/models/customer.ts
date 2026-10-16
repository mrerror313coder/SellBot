import mongoose, { Schema, Document } from 'mongoose';

export interface IFollowUp {
  type: string;
  scheduledFor: Date;
  sent: boolean;
  sentAt?: Date;
  responseReceived?: boolean;
  message?: string;
}

export interface ICustomer extends Document {
  storeId?: mongoose.Types.ObjectId | string;
  channelId: string;
  name: string;
  language: string;
  phone?: string;
  preferences?: {
    categories?: string[];
    priceRange?: { min: number; max: number };
    tone?: string;
  };
  purchaseHistory?: string[];
  lifetimeValue: number;
  lastInteraction: Date;
  followUps?: IFollowUp[];
  createdAt: Date;
  updatedAt: Date;
}

export const CustomerSchema = new Schema<ICustomer>(
  {
    storeId: { type: Schema.Types.Mixed, default: 'store_priya_001' },
    channelId: { type: String, required: true, unique: true },
    name: { type: String, default: 'WhatsApp Shopper' },
    language: { type: String, default: 'en' },
    phone: { type: String },
    preferences: {
      categories: { type: [String], default: [] },
      priceRange: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 5000 },
      },
      tone: { type: String, default: 'friendly' },
    },
    purchaseHistory: { type: [String], default: [] },
    lifetimeValue: { type: Number, default: 0 },
    lastInteraction: { type: Date, default: Date.now },
    followUps: [
      {
        type: { type: String, required: true },
        scheduledFor: { type: Date, required: true },
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        responseReceived: { type: Boolean, default: false },
        message: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const Customer: mongoose.Model<ICustomer> =
  (mongoose.models.Customer as any) || mongoose.model<ICustomer>('Customer', CustomerSchema);
