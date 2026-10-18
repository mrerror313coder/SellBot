export interface ExtractedEntities {
  recipient?: string;
  occasion?: string;
  budget?: number;
  currency?: string;
  productKeyword?: string;
  quantity?: number;
  outOfScopeItem?: string;
}

export type SupportedIntent =
  | 'greeting'
  | 'browse'
  | 'compare'
  | 'buy'
  | 'complain'
  | 'return'
  | 'support'
  | 'followup'
  | 'out_of_scope'
  | 'unknown';

export interface IntentClassificationResult {
  intent: SupportedIntent;
  confidence: number;
  entities: ExtractedEntities;
  reasoning: string;
}

export class IntentClassifierTool {
  public static classify(text: string, context?: any): IntentClassificationResult {
    const lower = text.toLowerCase().trim();
    const entities: ExtractedEntities = { ...context?.extractedEntities };

    // 1. Budget extraction (Rs., PKR, ₹, $)
    const budgetMatch = lower.match(/(?:budget|under|below|around|mein|ke andar|tak|max|up to)?\s*(?:rs\.?|pkr|inr|₹|\$)?\s*(\d{2,5})/i);
    if (budgetMatch && budgetMatch[1]) {
      const num = parseInt(budgetMatch[1], 10);
      if (num >= 50 && num <= 50000) {
        entities.budget = num;
        if (lower.includes('$')) entities.currency = 'USD';
        else if (lower.includes('pkr') || lower.includes('rs') || /\b(chahye|mujhy|kasy|lahore|karachi|islamabad)\b/.test(lower)) entities.currency = 'PKR';
        else entities.currency = 'INR';
      }
    }

    // 2. Recipient extraction
    if (/mom|mother|mummy|maa|ammi|walida/i.test(lower)) entities.recipient = 'mom';
    else if (/girlfriend|gf|wife|patni|biwi|begum/i.test(lower)) entities.recipient = 'girlfriend';
    else if (/boyfriend|bf|husband|pati|shohar/i.test(lower)) entities.recipient = 'boyfriend';
    else if (/friend|dost|colleague|yaar|bhai/i.test(lower)) entities.recipient = 'friend';
    else if (/sister|behen|didi|baji/i.test(lower)) entities.recipient = 'sister';
    else if (/brother|bhaiya|bhai/i.test(lower)) entities.recipient = 'brother';
    else if (/kids|children|bacche|bachay|son|daughter/i.test(lower)) entities.recipient = 'kids';

    // 3. Occasion extraction
    if (/birthday|janamdin|saalgirah|salgirah|cumpleaños/i.test(lower)) entities.occasion = 'birthday';
    else if (/anniversary|shaadi/i.test(lower)) entities.occasion = 'anniversary';
    else if (/mother'?s day|mothers day/i.test(lower)) entities.occasion = 'mothers-day';
    else if (/diwali|eid|christmas|new year|ramadan/i.test(lower)) entities.occasion = 'festival';

    // 4. Quantity extraction
    const qtyMatch = lower.match(/(\d+)\s*(?:kg|kilo|piece|pcs|box|pack|dabba)/i);
    if (qtyMatch && qtyMatch[1]) {
      entities.quantity = parseInt(qtyMatch[1], 10);
    }

    // 5. Intent Determination
    // Out-of-scope products (bike, motorcycle, car, laptop, mobile, phone, shoes, clothes)
    const outMatch = lower.match(/\b(bike|motorcycle|gadi|gaadi|car|mobile|phone|laptop|kapde|shoes|cycle|property)\b/i);
    if (outMatch) {
      entities.outOfScopeItem = outMatch[1];
      return {
        intent: 'out_of_scope',
        confidence: 0.95,
        entities,
        reasoning: `Customer requested out-of-scope product (${outMatch[1]}) not sold by bakery/store`,
      };
    }

    // Complaint / Return
    if (/damaged|broken|spoiled|kharab|sada|refund|return|complaint|bad taste|shikayat|tuta/i.test(lower)) {
      return {
        intent: 'complain',
        confidence: 0.94,
        entities,
        reasoning: 'Customer expressing dissatisfaction or requesting return/refund',
      };
    }

    // Buy / Checkout / Payment inquiry
    if (
      /order karna|book kar do|buy|checkout|confirm|pay|payment|upi|qr code|bhejo payment|pack this|take my order|lena hai|leni hai|order kr do|chahye aur pay krna|easypaisa|jazzcash|cash on delivery|\bcod\b/i.test(
        lower
      )
    ) {
      return {
        intent: 'buy',
        confidence: 0.96,
        entities,
        reasoning: 'Customer showing explicit readiness to purchase or pay',
      };
    }

    // Comparison
    if (/compare|vs|versus|difference|which is better|kisme kya antar|dono mein se kon sa|dono me se/i.test(lower)) {
      return {
        intent: 'compare',
        confidence: 0.91,
        entities,
        reasoning: 'Customer asking to compare two or more items',
      };
    }

    // Follow-up / Add-on confirmation
    if (/^(yes|haan|ha|ji|sure|add kar do|add kr dain|bilkul|ok|okay|kar do|yes please)/i.test(lower) && context?.cartItems?.length) {
      return {
        intent: 'followup',
        confidence: 0.89,
        entities,
        reasoning: 'Customer confirming add-on or upsell suggestion',
      };
    }

    // Product search / Browse (Takes priority if specific product mentioned)
    if (/cake|pastry|brownie|cookie|gift|eggless|chocolate|cheesecake|price|rate|dikhao|options|menu|mithai|fudge/i.test(lower)) {
      return {
        intent: 'browse',
        confidence: 0.93,
        entities,
        reasoning: 'Customer searching for products or inquiring about menu/options',
      };
    }

    // Greeting or "How are you"
    if (
      /^(hi|hello|hey|namaste|salam|assalam|aoa|walaikum|hola|ola|good morning|good evening|pranam)\b/i.test(lower) ||
      /\b(kasy|kesy|kese|kaise)\s+(ho|hain|hn)\b|\b(kia|kya)\s+(hal|haal)\b|\bhow are you\b/i.test(lower)
    ) {
      return {
        intent: 'greeting',
        confidence: 0.98,
        entities,
        reasoning: 'Customer greeting or inquiring how are you',
      };
    }

    return {
      intent: 'unknown',
      confidence: 0.5,
      entities,
      reasoning: 'General open inquiry requiring courteous clarification',
    };
  }
}
