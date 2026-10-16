import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  role: 'customer' | 'agent' | 'system';
  content: string;
  language?: string;
  timestamp: Date;
  mediaType?: 'text' | 'image' | 'voice' | 'audio' | 'document' | 'interactive';
  toolsUsed?: string[];
  reasoning?: string;
  tokensUsed?: number;
  latencyMs?: number;
}

export interface IConversation extends Document {
  storeId?: mongoose.Types.ObjectId | string;
  customerId?: mongoose.Types.ObjectId | string;
  channel: string;
  channelId: string;
  status: 'active' | 'closed' | 'escalated' | 'sold';
  messages: IMessage[];
  context: {
    detectedIntent?: string;
    extractedEntities?: {
      recipient?: string;
      occasion?: string;
      budget?: number;
      currency?: string;
    };
    cartItems?: Array<{
      productId: string;
      sku?: string;
      name: string;
      quantity: number;
      price: number;
    }>;
    totalValue?: number;
  };
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const ConversationSchema = new Schema<IConversation>(
  {
    storeId: { type: Schema.Types.Mixed, default: 'store_priya_001' },
    customerId: { type: Schema.Types.Mixed },
    channel: { type: String, default: 'whatsapp' },
    channelId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'closed', 'escalated', 'sold'],
      default: 'active',
      index: true,
    },
    messages: [
      {
        role: { type: String, enum: ['customer', 'agent', 'system'], required: true },
        content: { type: String, required: true },
        language: { type: String, default: 'en' },
        timestamp: { type: Date, default: Date.now },
        mediaType: { type: String, default: 'text' },
        toolsUsed: { type: [String], default: [] },
        reasoning: { type: String },
        tokensUsed: { type: Number, default: 0 },
        latencyMs: { type: Number, default: 0 },
      },
    ],
    context: {
      detectedIntent: { type: String },
      extractedEntities: {
        recipient: { type: String },
        occasion: { type: String },
        budget: { type: Number },
        currency: { type: String, default: 'INR' },
      },
      cartItems: [
        {
          productId: { type: String },
          sku: { type: String },
          name: { type: String },
          quantity: { type: Number, default: 1 },
          price: { type: Number, default: 0 },
        },
      ],
      totalValue: { type: Number, default: 0 },
    },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Conversation: mongoose.Model<IConversation> =
  (mongoose.models.Conversation as any) || mongoose.model<IConversation>('Conversation', ConversationSchema);
