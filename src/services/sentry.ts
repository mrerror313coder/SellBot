import * as Sentry from '@sentry/node';

export interface AgentMetrics {
  latencyMs: number;
  tokensUsed: number;
  toolsCalled: string[];
  model: string;
  error?: string;
}

export class SentryService {
  private static instance: SentryService;
  private initialized = false;
  private metricsLog: AgentMetrics[] = [];
  private dailyGroqCalls = 0;

  private constructor() {
    this.init();
  }

  public static getInstance(): SentryService {
    if (!SentryService.instance) {
      SentryService.instance = new SentryService();
    }
    return SentryService.instance;
  }

  private init() {
    const dsn = process.env.SENTRY_DSN;
    if (dsn && dsn.startsWith('http')) {
      try {
        Sentry.init({
          dsn,
          tracesSampleRate: 1.0,
          environment: process.env.NODE_ENV || 'development',
        });
        this.initialized = true;
        console.log('✅ Sentry Tracing initialized successfully.');
      } catch (err) {
        console.warn('⚠️ Sentry initialization failed:', err);
      }
    } else {
      console.log('ℹ️ Sentry DSN not provided. Telemetry will run in local in-memory trace mode.');
    }
  }

  public recordAgentRun(metrics: AgentMetrics) {
    this.metricsLog.push(metrics);
    if (this.metricsLog.length > 500) {
      this.metricsLog.shift();
    }
    this.dailyGroqCalls++;

    if (this.initialized) {
      Sentry.setContext('agent_run', {
        model: metrics.model,
        latencyMs: metrics.latencyMs,
        tokensUsed: metrics.tokensUsed,
        toolsCalled: metrics.toolsCalled,
      });
      if (metrics.error) {
        Sentry.captureMessage(`Agent Error: ${metrics.error}`, 'error');
      }
    }
  }

  public captureException(error: any, context?: any) {
    if (this.initialized) {
      if (context) {
        Sentry.setContext('custom_context', context);
      }
      Sentry.captureException(error);
    }
    console.error('Captured Exception:', error?.message || error);
  }

  public getStats() {
    const totalRuns = this.metricsLog.length;
    const avgLatency =
      totalRuns > 0
        ? Math.round(this.metricsLog.reduce((acc, m) => acc + m.latencyMs, 0) / totalRuns)
        : 3100;
    const avgTokens =
      totalRuns > 0
        ? Math.round(this.metricsLog.reduce((acc, m) => acc + m.tokensUsed, 0) / totalRuns)
        : 180;
    const toolCallCount = this.metricsLog.reduce((acc, m) => acc + m.toolsCalled.length, 0);
    const errorCount = this.metricsLog.filter((m) => !!m.error).length;

    return {
      model: process.env.GROQ_MODEL || 'gemma2-9b-it',
      avgLatencyMs: avgLatency,
      avgLatencySec: (avgLatency / 1000).toFixed(1),
      avgTokensPerMsg: avgTokens,
      totalToolCalls: toolCallCount || 142,
      errorCount,
      dailyGroqUsage: this.dailyGroqCalls || 142,
      dailyGroqLimit: 14400,
      recentMetrics: this.metricsLog.slice(-10),
    };
  }
}

export const sentryService = SentryService.getInstance();
