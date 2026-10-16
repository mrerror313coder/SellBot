import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { dbService } from './services/database';
import { whatsappService } from './services/whatsapp';
import { orchestratorAgent } from './agents/orchestrator';
import { FollowUpJob } from './jobs/follow-ups';
import { webhookRouter } from './routes/webhook';
import { productsRouter } from './routes/products';
import { conversationsRouter } from './routes/conversations';
import { analyticsRouter } from './routes/analytics';
import { paymentsRouter } from './routes/payments';
import { whatsappRouter } from './routes/whatsapp';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static dashboard and audio files
const dashboardDir = path.join(__dirname, '..', 'dashboard');
const audioDir = path.join(__dirname, '..', 'data', 'audio');

app.use(express.static(dashboardDir));
app.use('/api/voice', express.static(audioDir));

// API Routers
app.use('/api/webhook', webhookRouter);
app.use('/api/products', productsRouter);
app.use('/api/stores/:storeId/products', productsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api', whatsappRouter); // For /api/settings

// Serve Dashboard SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(dashboardDir, 'index.html'));
});

async function bootstrap() {
  console.log('🚀 Initializing SellBot Server...');

  // 1. Database Connection
  await dbService.connect();

  // 2. Start Background Follow-up Cron Job
  FollowUpJob.start();

  // 3. WhatsApp Baileys Connection Setup
  whatsappService.onMessage(async (msg) => {
    console.log(`📩 Incoming message from ${msg.from}: "${msg.body}" (${msg.mediaType})`);
    const output = await orchestratorAgent.processMessage({
      channelId: msg.from,
      senderName: msg.senderName,
      text: msg.body,
      mediaType: msg.mediaType,
      generateVoice: msg.mediaType === 'voice',
    });

    console.log(`🤖 SellBot reply (${output.language}, ${output.intent}): "${output.text.slice(0, 100)}..."`);
    return output.text;
  });

  if (process.env.ENABLE_WHATSAPP_AUTOSTART === 'true') {
    whatsappService.connect();
  } else {
    console.log('ℹ️ WhatsApp Auto-start is disabled in .env. Click "Scan QR" in the Web Dashboard or set ENABLE_WHATSAPP_AUTOSTART=true to connect a phone.');
  }

  // 4. Start HTTP Server
  const server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🧁 SellBot Server listening at http://localhost:${PORT}`);
    console.log(`📊 Admin Dashboard: http://localhost:${PORT}`);
    console.log(`💬 WhatsApp Live Simulator: http://localhost:${PORT}#simulator`);
    console.log(`🛒 Catalog API: http://localhost:${PORT}/api/products`);
    console.log(`📈 Sentry & Analytics API: http://localhost:${PORT}/api/analytics`);
    console.log(`======================================================\n`);
  });

  return server;
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    console.error('Fatal bootstrap error:', err);
    process.exit(1);
  });
}

export { app, bootstrap };
