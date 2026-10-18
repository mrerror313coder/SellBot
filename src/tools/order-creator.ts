import { Order, IOrder } from '../models/order';
import { Customer } from '../models/customer';
import { dbService, localDb } from '../services/database';
import { PaymentQRTool, PaymentQRResult } from './payment-qr';
import { FollowUpSchedulerTool } from './follow-up-scheduler';

export interface CreateOrderParams {
  items: Array<{ productId?: string; sku?: string; name: string; quantity: number; price: number }>;
  storeId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  conversationId?: string;
  subtotal: number;
  discount?: number;
  shipping?: number;
  total: number;
  currency?: string;
  paymentMethod?: 'upi' | 'paypal' | 'card' | 'cod';
}

export interface CreateOrderResult {
  order: any;
  payment: PaymentQRResult;
  confirmationMessage: string;
}

export class OrderCreatorTool {
  public static async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const {
      items,
      storeId = 'store_priya_001',
      customerId,
      customerName = 'Valued Customer',
      customerPhone,
      conversationId,
      subtotal,
      discount = 0,
      shipping = 0,
      total,
      currency = 'INR',
      paymentMethod = 'upi',
    } = params;

    const orderId = `ORD-${Date.now().toString().slice(-6)}`;

    // Generate Payment QR & UPI Link
    const payment = await PaymentQRTool.generate({
      amount: total,
      orderId,
      currency,
    });

    const orderData = {
      _id: orderId,
      storeId,
      customerId,
      customerName,
      customerPhone,
      conversationId,
      items,
      subtotal,
      discount,
      shipping,
      total,
      currency,
      paymentStatus: 'pending',
      paymentMethod,
      paymentQR: payment.qrDataUrl,
      paymentLink: payment.upiLink,
      orderStatus: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (dbService.isConnected) {
      try {
        await Order.create(orderData);
        if (customerPhone) {
          await Customer.findOneAndUpdate(
            { channelId: customerPhone },
            {
              $push: { purchaseHistory: orderId },
              $inc: { lifetimeValue: total },
              $set: { lastInteraction: new Date() },
            },
            { upsert: true }
          );
        }
      } catch (e) {
        console.warn('MongoDB insert failed, saving to local fallback:', e);
        localDb.orders.set(orderId, orderData);
        dbService.saveLocalBackup();
      }
    } else {
      localDb.orders.set(orderId, orderData);
      dbService.saveLocalBackup();
    }

    // Schedule automated autonomous follow-ups (T+1d, T+7d, T+30d)
    try {
      await FollowUpSchedulerTool.scheduleFollowUp({
        customerId: customerPhone || customerId || 'guest',
        customerName,
        orderId,
        scheduleType: 'T+1d',
      });
    } catch (e) {
      // non-fatal
    }

    const isPk = currency === 'PKR' || (customerPhone && (customerPhone.includes('923') || customerPhone.includes('+92')));
    const currSymbol = isPk ? 'Rs. ' : '₹';
    const itemsSummary = items.map((i) => `• ${i.quantity}x ${i.name} (${currSymbol}${i.price})`).join('\n');

    let paymentInstructions = '';
    if (isPk) {
      paymentInstructions =
        `📲 *Payment Options (Pakistan):*\n` +
        `• *EasyPaisa / JazzCash:* ${payment.easyPaisa}\n` +
        `• *Raast ID:* ${payment.raastId}\n` +
        `• *Cash on Delivery (COD):* Reply with your complete delivery address to confirm COD!\n\n` +
        `Scan the QR code or send screenshot after transfer.`;
    } else {
      paymentInstructions =
        `📲 *To Pay via UPI:* Scan the QR code or tap the link below:\n${payment.upiLink}\n\n` +
        `Once paid, kindly reply with a screenshot or transaction ID.`;
    }

    const confirmationMessage =
      `🎉 *Order Confirmed!* #${orderId}\n\n` +
      `Items:\n${itemsSummary}\n\n` +
      `Subtotal: ${currSymbol}${subtotal}\n` +
      (discount > 0 ? `Discount: -${currSymbol}${discount}\n` : '') +
      `Delivery: ${shipping === 0 ? 'FREE' : `${currSymbol}${shipping}`}\n` +
      `*Total Payable: ${currSymbol}${total}*\n\n` +
      `${paymentInstructions}\n\nThank you for choosing us! 🍰✨`;

    return {
      order: orderData,
      payment,
      confirmationMessage,
    };
  }
}
