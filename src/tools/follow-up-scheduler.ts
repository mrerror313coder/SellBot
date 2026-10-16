import { Customer } from '../models/customer';
import { dbService, localDb } from '../services/database';

export interface ScheduleFollowUpParams {
  customerId: string;
  customerName?: string;
  orderId: string;
  scheduleType: 'T+1d' | 'T+7d' | 'T+30d';
  customDelayMinutes?: number; // for testing
}

export interface ScheduledFollowUp {
  id: string;
  customerId: string;
  customerName?: string;
  orderId: string;
  scheduleType: string;
  scheduledFor: Date;
  message: string;
  sent: boolean;
  sentAt?: Date;
  responseReceived?: boolean;
}

export const activeFollowUps: ScheduledFollowUp[] = [];

export class FollowUpSchedulerTool {
  public static async scheduleFollowUp(params: ScheduleFollowUpParams): Promise<ScheduledFollowUp> {
    const { customerId, customerName = 'Customer', orderId, scheduleType, customDelayMinutes } = params;

    let delayMs = 24 * 60 * 60 * 1000; // T+1d default
    let defaultMsg = `Hi ${customerName}! 🎂 Your order #${orderId} was delivered. How did everyone enjoy it? We'd love your feedback!`;

    if (scheduleType === 'T+7d') {
      delayMs = 7 * 24 * 60 * 60 * 1000;
      defaultMsg = `Hi ${customerName}! 🍰 Craving another sweet treat this week? We have freshly baked batches ready. Let us know if you'd like our specials menu!`;
    } else if (scheduleType === 'T+30d') {
      delayMs = 30 * 24 * 60 * 60 * 1000;
      defaultMsg = `Hi ${customerName}! We miss you at Priya's Cakes! ❤️ Here is a special 10% treat on your next celebration with coupon code: *SWEET10*.`;
    }

    if (typeof customDelayMinutes === 'number') {
      delayMs = customDelayMinutes * 60 * 1000;
    }

    const scheduledFor = new Date(Date.now() + delayMs);
    const item: ScheduledFollowUp = {
      id: `fu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      customerId,
      customerName,
      orderId,
      scheduleType,
      scheduledFor,
      message: defaultMsg,
      sent: false,
    };

    activeFollowUps.push(item);

    if (dbService.isConnected) {
      try {
        await Customer.findOneAndUpdate(
          { channelId: customerId },
          {
            $push: {
              followUps: {
                type: scheduleType,
                scheduledFor,
                sent: false,
                message: defaultMsg,
              },
            },
          },
          { upsert: true }
        );
      } catch (e) {
        // local
      }
    }

    return item;
  }

  public static getDueFollowUps(): ScheduledFollowUp[] {
    const now = new Date();
    return activeFollowUps.filter((f) => !f.sent && f.scheduledFor <= now);
  }

  public static markSent(id: string) {
    const found = activeFollowUps.find((f) => f.id === id);
    if (found) {
      found.sent = true;
      found.sentAt = new Date();
    }
  }
}
