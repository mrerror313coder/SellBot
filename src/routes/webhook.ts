import { Router, Request, Response } from 'express';
import { orchestratorAgent } from '../agents/orchestrator';
import { rateLimiter } from '../utils/rate-limiter';

export const webhookRouter = Router();

/**
 * POST /api/webhook/message
 * Standard incoming WhatsApp webhook (compatible with Baileys webhook bridge)
 */
webhookRouter.post('/message', async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, message, timestamp } = req.body;

    if (!from || !message || !message.body) {
      res.status(400).json({ error: 'Missing required from or message.body in payload' });
      return;
    }

    // Rate limiting check (2s throttle, 50 msgs/hr anti-ban protection)
    const limitCheck = rateLimiter.isAllowed(from);
    if (!limitCheck.allowed) {
      res.status(429).json({
        error: limitCheck.reason,
        retryAfterMs: limitCheck.retryAfterMs,
      });
      return;
    }

    const agentResult = await orchestratorAgent.processMessage({
      channelId: from,
      text: message.body,
      mediaType: message.type || 'text',
    });

    res.status(200).json({
      status: 'success',
      conversationId: agentResult.conversationId,
      response: agentResult.text,
      language: agentResult.language,
      intent: agentResult.intent,
      paymentQR: agentResult.paymentQR,
      paymentLink: agentResult.paymentLink,
      metrics: agentResult.metrics,
    });
  } catch (err: any) {
    console.error('Error in webhook/message:', err);
    res.status(500).json({ error: 'Internal server error processing message', details: err.message });
  }
});

/**
 * POST /api/agent/respond
 * Direct internal agent response endpoint (Section 13.1)
 */
webhookRouter.post('/respond', async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId, storeId = 'store_priya_001', message = '', generateVoice = false } = req.body;

    const agentResult = await orchestratorAgent.processMessage({
      channelId: conversationId || `sim_${Date.now()}`,
      text: message,
      storeId,
      generateVoice,
    });

    res.status(200).json({
      conversationId: agentResult.conversationId,
      response: {
        text: agentResult.text,
        language: agentResult.language,
        products: (agentResult.products || []).map((p) => ({
          sku: p.sku,
          name: p.name,
          price: p.price,
        })),
        actions: agentResult.actions,
      },
      metrics: agentResult.metrics,
      paymentQR: agentResult.paymentQR,
      paymentLink: agentResult.paymentLink,
      voiceNoteUrl: agentResult.voiceNoteUrl,
    });
  } catch (err: any) {
    console.error('Error in agent/respond:', err);
    res.status(500).json({ error: 'Error generating agent response', details: err.message });
  }
});
