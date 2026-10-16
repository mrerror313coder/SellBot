interface RateLimitRecord {
  lastMessageTimestamp: number;
  hourlyCount: number;
  hourWindowStart: number;
}

export class RateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private readonly minIntervalMs: number;
  private readonly maxPerHour: number;

  constructor(minIntervalMs = 2000, maxPerHour = 50) {
    this.minIntervalMs = minIntervalMs;
    this.maxPerHour = maxPerHour;
  }

  /**
   * Evaluates if a message from channelId is permitted under anti-ban/anti-spam thresholds
   */
  public isAllowed(channelId: string): { allowed: boolean; retryAfterMs: number; reason?: string } {
    const now = Date.now();
    let record = this.records.get(channelId);

    if (!record) {
      record = {
        lastMessageTimestamp: 0,
        hourlyCount: 0,
        hourWindowStart: now,
      };
      this.records.set(channelId, record);
    }

    // Reset hourly window if > 1 hour
    if (now - record.hourWindowStart > 60 * 60 * 1000) {
      record.hourlyCount = 0;
      record.hourWindowStart = now;
    }

    // Check hourly limit
    if (record.hourlyCount >= this.maxPerHour) {
      const waitTime = 60 * 60 * 1000 - (now - record.hourWindowStart);
      return {
        allowed: false,
        retryAfterMs: Math.max(0, waitTime),
        reason: 'Hourly message limit exceeded. Please wait a while before sending another message.',
      };
    }

    // Check interval limit (2 second throttle)
    const timeSinceLast = now - record.lastMessageTimestamp;
    if (timeSinceLast < this.minIntervalMs) {
      return {
        allowed: false,
        retryAfterMs: this.minIntervalMs - timeSinceLast,
        reason: 'Rapid messages throttled to prevent WhatsApp rate limits.',
      };
    }

    record.lastMessageTimestamp = now;
    record.hourlyCount++;
    return { allowed: true, retryAfterMs: 0 };
  }
}

export const rateLimiter = new RateLimiter(2000, 50);
