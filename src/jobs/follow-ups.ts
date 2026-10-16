import cron from 'node-cron';
import { FollowUpSchedulerTool } from '../tools/follow-up-scheduler';
import { whatsappService } from '../services/whatsapp';
import { aiService } from '../services/ai';
import { BASE_SYSTEM_PROMPT } from '../agents/system-prompt';

export class FollowUpJob {
  private static task: cron.ScheduledTask | null = null;

  public static start() {
    if (this.task) return;

    // Run every hour: '0 * * * *'
    this.task = cron.schedule('0 * * * *', async () => {
      console.log('⏰ [node-cron] Running scheduled post-purchase follow-up job...');
      await this.runFollowUps();
    });

    console.log('✅ Follow-up cron job scheduled (Runs hourly).');
  }

  public static async runFollowUps(): Promise<number> {
    const dueItems = FollowUpSchedulerTool.getDueFollowUps();
    if (dueItems.length === 0) {
      console.log('ℹ️ No follow-ups currently due.');
      return 0;
    }

    let processed = 0;
    for (const item of dueItems) {
      try {
        console.log(`Processing follow-up for customer ${item.customerId} (Order #${item.orderId})...`);

        // Generate tailored message
        const prompt = [
          { role: 'system' as const, content: BASE_SYSTEM_PROMPT },
          {
            role: 'user' as const,
            content: `Generate a short, super warm WhatsApp follow-up for ${item.customerName || 'our customer'} who bought order #${item.orderId}. Stage: ${item.scheduleType}. Keep it under 2 sentences, include an emoji and offer help.`,
          },
        ];

        const aiRes = await aiService.chatCompletion(prompt, 0.4);
        const finalMsg = aiRes.text || item.message;

        // Send via WhatsApp if connected or simulate
        await whatsappService.sendMessage(item.customerId, finalMsg);
        FollowUpSchedulerTool.markSent(item.id);
        processed++;
      } catch (err) {
        console.error(`Error processing follow-up ${item.id}:`, err);
      }
    }

    return processed;
  }
}
