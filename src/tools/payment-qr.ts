import QRCode from 'qrcode';

export interface PaymentQRParams {
  amount: number;
  upiId?: string;
  orderId?: string;
  storeName?: string;
  currency?: string;
  easyPaisa?: string;
  jazzCash?: string;
  raastId?: string;
}

export interface PaymentQRResult {
  orderId: string;
  amount: number;
  currency: string;
  upiId: string;
  upiLink: string;
  paypalLink: string;
  easyPaisa: string;
  jazzCash: string;
  raastId: string;
  qrDataUrl: string;
}

export class PaymentQRTool {
  public static async generate(params: PaymentQRParams): Promise<PaymentQRResult> {
    const {
      amount,
      upiId = process.env.STORE_UPI || 'priya@paytm',
      orderId = `ORD-${Date.now().toString().slice(-6)}`,
      storeName = process.env.STORE_NAME || "Priya's Cakes",
      currency = process.env.STORE_CURRENCY || 'PKR',
      easyPaisa = process.env.STORE_EASYPAISA || '0301-1234567',
      jazzCash = process.env.STORE_JAZZCASH || '0300-1234567',
      raastId = process.env.STORE_RAAST || '03011234567',
    } = params;

    // UPI Link for Indian shoppers
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
      storeName
    )}&am=${amount.toFixed(2)}&cu=${currency === 'INR' ? 'INR' : 'PKR'}&tn=${encodeURIComponent(orderId)}`;

    // PayPal link fallback for international buyers
    const paypalUsername = upiId.split('@')[0] || 'store';
    const paypalLink = `https://paypal.me/${paypalUsername}/${amount}`;

    // Generate high-resolution base64 PNG QR code (encodes Order ID & Payment Details)
    const qrPayload = currency === 'PKR'
      ? `SellBot Order #${orderId} | Total: Rs. ${amount} | EasyPaisa/JazzCash: ${easyPaisa} | Raast: ${raastId}`
      : upiLink;

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
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
      easyPaisa,
      jazzCash,
      raastId,
      qrDataUrl,
    };
  }
}
