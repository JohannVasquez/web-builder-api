export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

const WINDOW_MS = 60_000;

// Ventana fija en memoria: sirve para frenar a un agente en bucle, que es el caso real.
// Con varias instancias el techo efectivo se multiplica; cuando eso importe, va a Redis.
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  public check(key: string, limitPerMinute: number, now = Date.now()): RateLimitDecision {
    const entry = this.hits.get(key);
    if (entry === undefined || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    entry.count += 1;
    if (entry.count > limitPerMinute) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
      };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  public reset(): void {
    this.hits.clear();
  }
}
