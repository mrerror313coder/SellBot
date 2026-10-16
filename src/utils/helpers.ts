export function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  return `$${amount.toFixed(2)}`;
}

export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function generateRandomId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}
