import { Router, Request, Response } from 'express';
import { PaymentQRTool } from '../tools/payment-qr';
import { Order } from '../models/order';
import { dbService, localDb } from '../services/database';

export const paymentsRouter = Router();

/**
 * POST /api/payments/qr
 * Generate payment QR as specified in Section 13.1 of PRD
 */
paymentsRouter.post('/qr', async (req: Request, res: Response) => {
  try {
    const { upiId, amount, currency, orderId } = req.body;

    if (!amount) {
      res.status(400).json({ error: 'Amount is required' });
      return;
    }

    const qrResult = await PaymentQRTool.generate({
      amount: parseFloat(amount),
      upiId,
      orderId,
      currency,
    });

    res.json({
      qrDataUrl: qrResult.qrDataUrl,
      upiLink: qrResult.upiLink,
      paypalLink: qrResult.paypalLink,
      orderId: qrResult.orderId,
      amount: qrResult.amount,
      currency: qrResult.currency,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate payment QR', details: err.message });
  }
});

/**
 * GET /api/orders
 * List confirmed orders
 */
paymentsRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    if (dbService.isConnected) {
      const orders = await Order.find().sort({ createdAt: -1 }).limit(50).lean();
      res.json(orders);
      return;
    }
    const orders = Array.from(localDb.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch orders', details: err.message });
  }
});
