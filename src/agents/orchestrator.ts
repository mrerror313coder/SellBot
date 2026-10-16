import { LanguageDetectorTool, LanguageDetectionResult } from '../tools/language-detector';
import { IntentClassifierTool, IntentClassificationResult } from '../tools/intent-classifier';
import { CatalogSearchTool, CatalogSearchResult } from '../tools/catalog-search';
import { InventoryCheckTool } from '../tools/inventory-check';
import { PriceCalculatorTool, CartItem } from '../tools/price-calculator';
import { PaymentQRTool } from '../tools/payment-qr';
import { OrderCreatorTool } from '../tools/order-creator';
import { aiService, ChatMessage } from '../services/ai';
import { voiceService } from '../services/voice';
import { sentryService } from '../services/sentry';
import { dbService, localDb } from '../services/database';
import { Conversation } from '../models/conversation';
import { Customer } from '../models/customer';
import { BASE_SYSTEM_PROMPT, getLanguageSystemPrompt } from './system-prompt';
import { englishPrompts } from './prompts/en';
import { hindiPrompts } from './prompts/hi';
import { spanishPrompts } from './prompts/es';
import { arabicPrompts } from './prompts/ar';
import { portuguesePrompts } from './prompts/pt';

export interface AgentProcessInput {
  channelId: string;
  senderName?: string;
  text: string;
  mediaType?: 'text' | 'image' | 'voice' | 'audio' | 'document';
  storeId?: string;
  generateVoice?: boolean;
}

export interface AgentProcessOutput {
  conversationId: string;
  text: string;
  language: string;
  intent: string;
  products?: any[];
  order?: any;
  paymentQR?: string;
  paymentLink?: string;
  voiceNoteUrl?: string;
  actions: string[];
  metrics: {
    latencyMs: number;
    tokensUsed: number;
    toolsCalled: string[];
    model: string;
  };
}

export class SellBotOrchestrator {
  private static instance: SellBotOrchestrator;

  public static getInstance(): SellBotOrchestrator {
    if (!SellBotOrchestrator.instance) {
      SellBotOrchestrator.instance = new SellBotOrchestrator();
    }
    return SellBotOrchestrator.instance;
  }

  public async processMessage(input: AgentProcessInput): Promise<AgentProcessOutput> {
    const startTime = Date.now();
    const toolsCalled: string[] = [];
    const actions: string[] = [];
    let tokensUsed = 0;
    let modelUsed = process.env.GROQ_MODEL || 'gemma2-9b-it';

    const { channelId, senderName = 'Friend', text, storeId = 'store_priya_001', generateVoice = false } = input;
    const store = await dbService.getStore(storeId);
    const storeName = store?.name || "Priya's Cakes";

    // 1. Tool 1: Language Detection
    toolsCalled.push('language_detector');
    const langResult: LanguageDetectionResult = LanguageDetectorTool.detect(text);
    const lang = langResult.language;

    // 2. Load or initialize Conversation
    const conversation = await this.getOrCreateConversation(channelId, storeId);
    const context = conversation.context || { cartItems: [], totalValue: 0 };

    // 3. Tool 2: Intent Classification & Entity Extraction
    toolsCalled.push('intent_classifier');
    const intentResult: IntentClassificationResult = IntentClassifierTool.classify(text, context);
    const intent = intentResult.intent;

    // Merge entities into conversation context
    context.detectedIntent = intent;
    if (!context.extractedEntities) context.extractedEntities = {};
    Object.assign(context.extractedEntities, intentResult.entities);

    let replyText = '';
    let matchedProducts: any[] = [];
    let createdOrder: any = undefined;
    let paymentQR: string | undefined = undefined;
    let paymentLink: string | undefined = undefined;

    // 4. Decision Logic & Tool Execution State Machine
    if (intent === 'greeting') {
      actions.push('send_greeting', 'suggest_categories');
      if (lang === 'hi' || lang === 'hi-en') {
        replyText = hindiPrompts.greeting(storeName);
      } else if (lang === 'es') {
        replyText = spanishPrompts.greeting(storeName);
      } else if (lang === 'ar') {
        replyText = arabicPrompts.greeting(storeName);
      } else if (lang === 'pt') {
        replyText = portuguesePrompts.greeting(storeName);
      } else {
        replyText = englishPrompts.greeting(storeName);
      }
    } else if (intent === 'complain' || intent === 'return') {
      actions.push('handle_complaint', 'escalate_to_human');
      conversation.status = 'escalated';
      if (lang === 'hi' || lang === 'hi-en') {
        replyText = `Humein behad afsos hai ki aapko problem aayi! 🙏 Hum quality ko leke bilkul compromise nahi karte.\n\nMai turant yeh issue Priya (Store Owner) ko forward kar raha hoon, aur aapko replacement ya 100% refund provide kiya jayega.\n\nKripya damaged product ka photo bhej dein. Ek human executive 5 minute mein aapse yahan connect karega.`;
      } else {
        replyText = `We are truly sorry for the trouble! 🙏 We take our quality very seriously.\n\nI have immediately escalated this to our store owner, and we will issue a full replacement or instant refund.\n\nPlease share a quick photo of the item, and a team member will assist you here within minutes.`;
      }
    } else if (intent === 'buy') {
      actions.push('checkout', 'generate_payment_qr');
      toolsCalled.push('inventory_check', 'price_calculator', 'payment_qr', 'order_creator');

      let itemsToBuy: CartItem[] = (context.cartItems && context.cartItems.length > 0) ? context.cartItems : [];

      if (itemsToBuy.length === 0) {
        // Find best match to buy directly
        toolsCalled.push('catalog_search');
        const searchResults = await CatalogSearchTool.search({
          query: text,
          budget: context.extractedEntities.budget,
          limit: 1,
        });

        if (searchResults.length > 0) {
          const p = searchResults[0].product;
          itemsToBuy = [{ productId: p._id, sku: p.sku, name: p.name, quantity: 1, price: p.price }];
          context.cartItems = itemsToBuy;
        }
      }

      if (itemsToBuy.length > 0) {
        const pricing = PriceCalculatorTool.calculate(
          itemsToBuy,
          undefined,
          store?.settings?.freeShippingThreshold || 1000,
          store?.settings?.currency || 'INR'
        );

        const orderResult = await OrderCreatorTool.createOrder({
          items: itemsToBuy,
          storeId,
          customerPhone: channelId,
          customerName: senderName,
          conversationId: conversation._id?.toString(),
          subtotal: pricing.subtotal,
          discount: pricing.discount,
          shipping: pricing.shipping,
          total: pricing.total,
          currency: pricing.currency,
          paymentMethod: 'upi',
        });

        createdOrder = orderResult.order;
        paymentQR = orderResult.payment.qrDataUrl;
        paymentLink = orderResult.payment.upiLink;
        replyText = orderResult.confirmationMessage;
        conversation.status = 'sold';
      } else {
        if (lang === 'hi' || lang === 'hi-en') {
          replyText = hindiPrompts.emptyCartCheckout();
        } else {
          replyText = englishPrompts.emptyCartCheckout();
        }
      }
    } else if (intent === 'followup' && context.cartItems && context.cartItems.length > 0) {
      // Add complimentary item
      actions.push('add_upsell_item');
      toolsCalled.push('price_calculator', 'payment_qr');

      const addOnItem: CartItem = {
        name: 'Birthday Candles & Sparkler Pack',
        price: 30,
        quantity: 1,
        sku: 'CND-BIR-001',
      };
      context.cartItems.push(addOnItem);

      const pricing = PriceCalculatorTool.calculate(
        context.cartItems,
        undefined,
        store?.settings?.freeShippingThreshold || 1000
      );

      context.totalValue = pricing.total;

      const orderResult = await OrderCreatorTool.createOrder({
        items: context.cartItems,
        storeId,
        customerPhone: channelId,
        customerName: senderName,
        conversationId: conversation._id?.toString(),
        subtotal: pricing.subtotal,
        discount: pricing.discount,
        shipping: pricing.shipping,
        total: pricing.total,
      });

      createdOrder = orderResult.order;
      paymentQR = orderResult.payment.qrDataUrl;
      paymentLink = orderResult.payment.upiLink;
      replyText = `Awesome! Added the Candles & Sparkler pack (+₹30) to your celebration order! 🎉\n\n${orderResult.confirmationMessage}`;
      conversation.status = 'sold';
    } else {
      // Browse, Compare, or General Product Query
      actions.push('search_catalog', 'recommend_products');
      toolsCalled.push('catalog_search', 'inventory_check');

      const searchResults = await CatalogSearchTool.search({
        query: text,
        budget: context.extractedEntities.budget,
        limit: intent === 'compare' ? 2 : 3,
      });

      matchedProducts = searchResults.map((r) => r.product);

      if (matchedProducts.length > 0) {
        // Put the top product into prospective cart
        const topProduct = matchedProducts[0];
        context.cartItems = [
          {
            productId: topProduct._id,
            sku: topProduct.sku,
            name: topProduct.name,
            quantity: 1,
            price: topProduct.price,
          },
        ];
        context.totalValue = topProduct.price;

        // Reason with LLM (Groq Gemma 2 9B)
        const messagesForAI: ChatMessage[] = [
          {
            role: 'system',
            content: `${BASE_SYSTEM_PROMPT}\n${getLanguageSystemPrompt(lang)}\n` +
              `Store Products Context:\n${searchResults.map((s, idx) => `${idx + 1}. ${s.product.name} (SKU: ${s.product.sku}) - ₹${s.product.price} - ${s.product.description} [Stock: ${s.product.inventory?.quantity || 10}, Rating: ${s.product.rating}⭐] Reason: ${s.matchReason}`).join('\n')}\n` +
              `Customer Intent: ${intent}. Entities: ${JSON.stringify(context.extractedEntities)}. Always recommend and explain WHY. Mention prices from catalog and ask if they would like to lock in this order.`,
          },
        ];

        // Include recent conversation turns for memory
        const recentHistory = (conversation.messages || []).slice(-4);
        recentHistory.forEach((m: any) => {
          messagesForAI.push({
            role: m.role === 'customer' ? 'user' : 'assistant',
            content: m.content,
          });
        });
        messagesForAI.push({ role: 'user', content: text });

        const aiResponse = await aiService.chatCompletion(messagesForAI, 0.4);
        replyText = aiResponse.text;
        tokensUsed = aiResponse.tokensUsed;
        modelUsed = aiResponse.model;
      } else {
        // Fallback search suggestions
        if (lang === 'hi' || lang === 'hi-en') {
          replyText = `Mujhe aapki exact query se match nahi mila, lekin hamare paas taaza *Chocolate Truffle Cake* (₹750), *Red Velvet Cake* (₹800), aur *Eggless Vanilla Cake* (₹600) available hain! 🍰\n\nKya aap inme se kuch dekhna chahenge?`;
        } else {
          replyText = `I couldn't find an exact match for that, but our fresh favorites right now include our *Chocolate Truffle Cake* ($10 / ₹750), *Red Velvet Cake* ($11 / ₹800), and *Eggless Vanilla Cake* ($8 / ₹600)! 🍰\n\nWould you like details on any of these?`;
        }
      }
    }

    // 5. Generate Voice Note if requested
    let voiceNoteUrl: string | undefined;
    if (generateVoice) {
      toolsCalled.push('voice_tts');
      const voiceResult = await voiceService.generateVoiceNote({
        text: replyText.slice(0, 250),
        language: lang,
      });
      voiceNoteUrl = voiceResult.audioUrl;
    }

    const latencyMs = Date.now() - startTime;

    // 6. Record conversation turns into memory
    const customerMsg = {
      role: 'customer' as const,
      content: text,
      language: lang,
      timestamp: new Date(),
      mediaType: input.mediaType || 'text',
    };

    const agentMsg = {
      role: 'agent' as const,
      content: replyText,
      language: lang,
      timestamp: new Date(),
      toolsUsed: toolsCalled,
      reasoning: `Intent: ${intent}, Entities: ${JSON.stringify(context.extractedEntities)}`,
      tokensUsed,
      latencyMs,
    };

    conversation.messages.push(customerMsg, agentMsg);
    conversation.lastMessageAt = new Date();
    conversation.context = context;
    await this.saveConversation(conversation);

    // 7. Sentry Telemetry Tracing
    sentryService.recordAgentRun({
      latencyMs,
      tokensUsed,
      toolsCalled,
      model: modelUsed,
    });

    return {
      conversationId: conversation._id?.toString() || channelId,
      text: replyText,
      language: lang,
      intent,
      products: matchedProducts,
      order: createdOrder,
      paymentQR,
      paymentLink,
      voiceNoteUrl,
      actions,
      metrics: {
        latencyMs,
        tokensUsed,
        toolsCalled,
        model: modelUsed,
      },
    };
  }

  private async getOrCreateConversation(channelId: string, storeId: string): Promise<any> {
    if (dbService.isConnected) {
      try {
        let conv = await Conversation.findOne({ channelId, storeId }).lean();
        if (!conv) {
          conv = await Conversation.create({
            channelId,
            storeId,
            status: 'active',
            messages: [],
            context: { cartItems: [], totalValue: 0 },
            lastMessageAt: new Date(),
          });
        }
        return conv;
      } catch (e) {
        // fallback
      }
    }

    if (!localDb.conversations.has(channelId)) {
      const newConv = {
        _id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        channelId,
        storeId,
        status: 'active',
        messages: [],
        context: { cartItems: [], totalValue: 0 },
        lastMessageAt: new Date(),
        createdAt: new Date(),
      };
      localDb.conversations.set(channelId, newConv);
      dbService.saveLocalBackup();
      return newConv;
    }

    return localDb.conversations.get(channelId);
  }

  private async saveConversation(conv: any) {
    if (dbService.isConnected && conv._id) {
      try {
        await Conversation.findByIdAndUpdate(conv._id, {
          $set: {
            messages: conv.messages,
            context: conv.context,
            status: conv.status,
            lastMessageAt: conv.lastMessageAt,
          },
        });
        return;
      } catch (e) {
        // fallback
      }
    }

    localDb.conversations.set(conv.channelId, conv);
    dbService.saveLocalBackup();
  }
}

export const orchestratorAgent = SellBotOrchestrator.getInstance();
