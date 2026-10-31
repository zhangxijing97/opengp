// Per-provider request throttle: bounded concurrency, minimum spacing between
// request starts, and a protective rolling-window quota kept below the
// supplier's published limit. Exhausting the window fails fast instead of
// queueing indefinitely, so callers can report partial coverage / 503.

export interface ThrottleOptions {
  maxConcurrent: number;
  minIntervalMs: number;
  windowMs: number;
  maxRequestsPerWindow: number;
}

export class ThrottleQuotaExceededError extends Error {
  constructor(readonly retryAfterMs: number) {
    super('Local request quota exhausted');
    this.name = 'ThrottleQuotaExceededError';
  }
}

export type SleepFn = (ms: number) => Promise<void>;

export const defaultSleep: SleepFn = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class RequestThrottle {
  private active = 0;
  private readonly waiters: Array<() => void> = [];
  private nextStartAtMs = 0;
  private readonly startTimes: number[] = [];

  constructor(
    private readonly options: ThrottleOptions,
    private readonly now: () => number = Date.now,
    private readonly sleep: SleepFn = defaultSleep,
  ) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquireSlot();
    try {
      await this.reserveStartTime();
      return await task();
    } finally {
      this.releaseSlot();
    }
  }

  private async acquireSlot(): Promise<void> {
    if (this.active < this.options.maxConcurrent) {
      this.active++;
      return;
    }
    // The releasing task hands its slot over; `active` stays unchanged.
    await new Promise<void>((resolve) => this.waiters.push(resolve));
  }

  private releaseSlot(): void {
    const next = this.waiters.shift();
    if (next) {
      next();
    } else {
      this.active--;
    }
  }

  private async reserveStartTime(): Promise<void> {
    const now = this.now();
    const windowStart = now - this.options.windowMs;
    while (this.startTimes.length > 0 && this.startTimes[0] <= windowStart) {
      this.startTimes.shift();
    }
    if (this.startTimes.length >= this.options.maxRequestsPerWindow) {
      const retryAfterMs = this.startTimes[0] + this.options.windowMs - now;
      throw new ThrottleQuotaExceededError(Math.max(retryAfterMs, 0));
    }

    // Reserve synchronously so concurrent callers cannot share a start time.
    const startAt = Math.max(now, this.nextStartAtMs);
    this.nextStartAtMs = startAt + this.options.minIntervalMs;
    this.startTimes.push(startAt);

    const waitMs = startAt - now;
    if (waitMs > 0) await this.sleep(waitMs);
  }
}
