import { Router, Request, Response } from 'express';
import { Conversation } from '../models/conversation';
import { dbService, localDb } from '../services/database';

export const conversationsRouter = Router();

/**
 * GET /api/conversations
 * List all customer conversations
 */
conversationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    if (dbService.isConnected) {
      const filter: any = {};
      if (status && status !== 'all') filter.status = status;
      const list = await Conversation.find(filter).sort({ lastMessageAt: -1 }).lean();
      res.json(list);
      return;
    }

    let items = Array.from(localDb.conversations.values());
    if (status && status !== 'all') {
      items = items.filter((c) => c.status === status);
    }
    items.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch conversations', details: err.message });
  }
});

/**
 * GET /api/conversations/:id
 * Full transcript of conversation
 */
conversationsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (dbService.isConnected) {
      const conv = (await Conversation.findById(id).lean()) || (await Conversation.findOne({ channelId: id }).lean());
      if (!conv) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }
      res.json(conv);
      return;
    }

    const conv = localDb.conversations.get(id) || Array.from(localDb.conversations.values()).find((c) => c._id === id || c.channelId === id);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(conv);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch conversation', details: err.message });
  }
});

/**
 * PATCH /api/conversations/:id/status
 * Update status (active, sold, escalated, closed)
 */
conversationsRouter.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'sold', 'escalated', 'closed'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    if (dbService.isConnected) {
      const updated = await Conversation.findByIdAndUpdate(id, { $set: { status } }, { new: true });
      res.json(updated);
      return;
    }

    const conv = localDb.conversations.get(id) || Array.from(localDb.conversations.values()).find((c) => c._id === id || c.channelId === id);
    if (conv) {
      conv.status = status;
      dbService.saveLocalBackup();
      res.json(conv);
      return;
    }

    res.status(404).json({ error: 'Conversation not found' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update conversation', details: err.message });
  }
});
