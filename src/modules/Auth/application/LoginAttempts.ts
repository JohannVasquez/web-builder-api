export interface LockDecision {
  readonly locked: boolean;
  readonly retryAfterSeconds: number;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

// Cuenta los fallos por correo Y por IP a la vez: solo por correo, cualquiera bloquea la
// cuenta ajena a propósito; solo por IP, una oficina entera comparte cuota.
export class LoginAttempts {
  private readonly failures = new Map<string, { count: number; until: number }>();

  public check(email: string, ip: string, now = Date.now()): LockDecision {
    const worst = [this.entryFor(email, now), this.entryFor(ip, now)].reduce(
      (previous, current) => (current.count > previous.count ? current : previous),
    );

    if (worst.count >= MAX_ATTEMPTS) {
      return {
        locked: true,
        retryAfterSeconds: Math.max(1, Math.ceil((worst.until - now) / 1000)),
      };
    }
    return { locked: false, retryAfterSeconds: 0 };
  }

  public recordFailure(email: string, ip: string, now = Date.now()): void {
    for (const key of [email, ip]) {
      const entry = this.entryFor(key, now);
      this.failures.set(key, { count: entry.count + 1, until: now + WINDOW_MS });
    }
  }

  // Entrar bien limpia el contador: si la persona recordó su clave, no hay nada que frenar.
  public clear(email: string, ip: string): void {
    this.failures.delete(email);
    this.failures.delete(ip);
  }

  public reset(): void {
    this.failures.clear();
  }

  private entryFor(key: string, now: number): { count: number; until: number } {
    const entry = this.failures.get(key);
    if (entry === undefined || entry.until <= now) {
      return { count: 0, until: now };
    }
    return entry;
  }
}
