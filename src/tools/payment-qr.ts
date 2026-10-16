import QRCode from 'qrcode';

export interface PaymentQRParams {
  amount: number;
  upiId?: string;
  orderId?: string;
  storeName?: string;
  currency?: string;
}

export interface PaymentQRResult {
  orderId: string;
  amount: number;
  currency: string;
  upiId: string;
  upiLink: string;
  paypalLink: string;
  qrDataUrl: string;
}

export class PaymentQRTool {
  public static async generate(params: PaymentQRParams): Promise<PaymentQRResult> {
    const {
      amount,
      upiId = process.env.STORE_UPI || 'priya@paytm',
      orderId = `ORD-${Date.now().toString().slice(-6)}`,
      storeName = process.env.STORE_NAME || "Priya's Cakes",
      currency = process.env.STORE_CURRENCY || 'INR',
    } = params;

    // Standard NPCI UPI URI Scheme
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
      storeName
    )}&am=${amount.toFixed(2)}&cu=${currency}&tn=${encodeURIComponent(orderId)}`;

    // PayPal link fallback for international buyers
    const paypalUsername = upiId.split('@')[0] || 'store';
    const paypalLink = `https://paypal.me/${paypalUsername}/${amount}`;

    // Generate high-resolution base64 PNG QR code
    const qrDataUrl = await QRCode.toDataURL(upiLink, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    return {
      orderId,
      amount,
      currency,
      upiId,
      upiLink,
      paypalLink,
      qrDataUrl,
    };
  }
}
