export interface ExtractedEntities {
  recipient?: string;
  occasion?: string;
  budget?: number;
  currency?: string;
  productKeyword?: string;
  quantity?: number;
}

export interface IntentClassificationResult {
  intent: 'greeting' | 'browse' | 'compare' | 'buy' | 'complain' | 'return' | 'support' | 'followup' | 'unknown';
  confidence: number;
  entities: ExtractedEntities;
  reasoning: string;
}

export class IntentClassifierTool {
  public static classify(text: string, context?: any): IntentClassificationResult {
    const lower = text.toLowerCase();
    const entities: ExtractedEntities = { ...context?.extractedEntities };

    // 1. Budget extraction
    const budgetMatch = lower.match(/(?:budget|under|below|around|mein|ke andar|max|up to)?\s*(?:rs\.?|inr|₹|\$)?\s*(\d{2,5})/i);
    if (budgetMatch && budgetMatch[1]) {
      const num = parseInt(budgetMatch[1], 10);
      if (num >= 50 && num <= 50000) {
        entities.budget = num;
        entities.currency = lower.includes('$') ? 'USD' : 'INR';
      }
    }

    // 2. Recipient extraction
    if (/mom|mother|mummy|maa|ammi/i.test(lower)) entities.recipient = 'mom';
    else if (/girlfriend|gf|wife|patni/i.test(lower)) entities.recipient = 'girlfriend';
    else if (/boyfriend|bf|husband|pati/i.test(lower)) entities.recipient = 'boyfriend';
    else if (/friend|dost|colleague|yaar/i.test(lower)) entities.recipient = 'friend';
    else if (/sister|behen|didi/i.test(lower)) entities.recipient = 'sister';
    else if (/brother|bhai/i.test(lower)) entities.recipient = 'brother';
    else if (/kids|children|bacche|son|daughter/i.test(lower)) entities.recipient = 'kids';

    // 3. Occasion extraction
    if (/birthday|janamdin|cumpleaños/i.test(lower)) entities.occasion = 'birthday';
    else if (/anniversary|saalgirha/i.test(lower)) entities.occasion = 'anniversary';
    else if (/mother'?s day|mothers day/i.test(lower)) entities.occasion = 'mothers-day';
    else if (/diwali|eid|christmas|new year/i.test(lower)) entities.occasion = 'festival';

    // 4. Quantity extraction
    const qtyMatch = lower.match(/(\d+)\s*(?:kg|kilo|piece|pcs|box|pack)/i);
    if (qtyMatch && qtyMatch[1]) {
      entities.quantity = parseInt(qtyMatch[1], 10);
    }

    // 5. Intent Determination
    // Complaint / Return
    if (/damaged|broken|spoiled|kharab|sada|refund|return|complaint|bad taste|shikayat/i.test(lower)) {
      return {
        intent: 'complain',
        confidence: 0.94,
        entities,
        reasoning: 'Customer expressing dissatisfaction or requesting return/refund',
      };
    }

    // Buy / Checkout / Order confirmation
    if (
      /order karna|book kar do|buy|checkout|confirm|pay|payment|upi|qr code|bhejo payment|pack this|take my order/i.test(
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
    if (/compare|vs|versus|difference|which is better|kisme kya antar|dono mein se kon sa/i.test(lower)) {
      return {
        intent: 'compare',
        confidence: 0.91,
        entities,
        reasoning: 'Customer asking to compare two or more items',
      };
    }

    // Follow-up / Add-on response
    if (/^(yes|haan|ha|sure|add kar do|bilkul|ok|okay|kar do|yes please)/i.test(lower.trim()) && context?.cartItems?.length) {
      return {
        intent: 'followup',
        confidence: 0.89,
        entities,
        reasoning: 'Customer confirming add-on or upsell suggestion',
      };
    }

    // Greeting
    if (/^(hi|hello|hey|namaste|salam|hola|ola|good morning|good evening|pranam)\b/i.test(lower.trim())) {
      return {
        intent: 'greeting',
        confidence: 0.98,
        entities,
        reasoning: 'Standard opening greeting',
      };
    }

    // Product search / Browse
    if (/cake|pastry|brownie|cookie|gift|eggless|chocolate|cheesecake|price|rate|dikhao|options|menu/i.test(lower)) {
      return {
        intent: 'browse',
        confidence: 0.93,
        entities,
        reasoning: 'Customer searching for products or inquiring about menu/options',
      };
    }

    return {
      intent: 'unknown',
      confidence: 0.5,
      entities,
      reasoning: 'General open inquiry requiring gentle conversational clarification',
    };
  }
}
