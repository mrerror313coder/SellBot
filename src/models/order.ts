import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  productId?: string;
  sku?: string;
  name: string;
  quantity: number;
  price: number;
}

export interface IOrder extends Document {
  storeId?: mongoose.Types.ObjectId | string;
  customerId?: mongoose.Types.ObjectId | string;
  customerName?: string;
  customerPhone?: string;
  conversationId?: mongoose.Types.ObjectId | string;
  items: IOrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  currency: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentMethod: 'upi' | 'paypal' | 'card' | 'cod';
  paymentQR?: string;
  paymentLink?: string;
  orderStatus: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = new Schema<IOrder>(
  {
    storeId: { type: Schema.Types.Mixed, default: 'store_priya_001' },
    customerId: { type: Schema.Types.Mixed },
    customerName: { type: String, default: 'Customer' },
    customerPhone: { type: String },
    conversationId: { type: Schema.Types.Mixed },
    items: [
      {
        productId: { type: String },
        sku: { type: String },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        price: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['upi', 'paypal', 'card', 'cod'],
      default: 'upi',
    },
    paymentQR: { type: String },
    paymentLink: { type: String },
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
);

export const Order: mongoose.Model<IOrder> =
  (mongoose.models.Order as any) || mongoose.model<IOrder>('Order', OrderSchema);
