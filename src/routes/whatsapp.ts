import { Router, Request, Response } from 'express';
import { whatsappService } from '../services/whatsapp';
import { orchestratorAgent } from '../agents/orchestrator';
import { dbService } from '../services/database';

export const whatsappRouter = Router();

/**
 * GET /api/whatsapp/status
 * Check if Baileys is connected and get active pairing QR code
 */
whatsappRouter.get('/status', (req: Request, res: Response) => {
  res.json(whatsappService.getStatus());
});

/**
 * POST /api/whatsapp/connect
 * Manually trigger Baileys connection to generate a fresh QR code
 */
whatsappRouter.post('/connect', async (req: Request, res: Response) => {
  try {
    whatsappService.connect();
    res.json({ status: 'Connecting... Watch terminal or dashboard for QR code scan.', ...whatsappService.getStatus() });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to initiate WhatsApp connection', details: err.message });
  }
});

/**
 * POST /api/whatsapp/simulate
 * Interactive chat simulation for testing from dashboard
 */
whatsappRouter.post('/simulate', async (req: Request, res: Response) => {
  try {
    const { from = '919876543210@s.whatsapp.net', message, senderName = 'Rahul Sharma', generateVoice = false } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    const output = await orchestratorAgent.processMessage({
      channelId: from,
      senderName,
      text: message,
      generateVoice,
    });

    res.json(output);
  } catch (err: any) {
    res.status(500).json({ error: 'Simulation failed', details: err.message });
  }
});

/**
 * GET & POST /api/settings
 * Store and Agent configuration (Section 14.2 Page 4)
 */
whatsappRouter.get('/settings', async (req: Request, res: Response) => {
  try {
    const store = await dbService.getStore();
    res.json(store);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get settings', details: err.message });
  }
});

whatsappRouter.post('/settings', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const updated = await dbService.updateStoreSettings('store_priya_001', updates);
    res.json({ success: true, store: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update settings', details: err.message });
  }
});
