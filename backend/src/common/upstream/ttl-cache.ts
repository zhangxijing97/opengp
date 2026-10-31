// Bounded in-memory TTL cache. Only successful, parsed values are stored;
// callers must never cache an upstream failure as an empty value.

interface CacheRecord<V> {
  value: V;
  storedAt: number;
  expiresAt: number;
}

export interface CachedValue<V> {
  value: V;
  storedAt: number;
}

export class TtlCache<V> {
  private readonly records = new Map<string, CacheRecord<V>>();

  constructor(
    private readonly maxEntries: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): CachedValue<V> | null {
    const record = this.records.get(key);
    if (!record) return null;
    if (this.now() >= record.expiresAt) {
      this.records.delete(key);
      return null;
    }
    return { value: record.value, storedAt: record.storedAt };
  }

  set(key: string, value: V, ttlMs: number): void {
    if (ttlMs <= 0) return;
    const now = this.now();
    this.records.delete(key);

    if (this.records.size >= this.maxEntries) {
      for (const [existingKey, record] of this.records) {
        if (now >= record.expiresAt) this.records.delete(existingKey);
      }
    }
    while (this.records.size >= this.maxEntries) {
      const [oldest] = this.records.keys();
      if (oldest === undefined) break;
      this.records.delete(oldest);
    }

    this.records.set(key, { value, storedAt: now, expiresAt: now + ttlMs });
  }

  delete(key: string): void {
    this.records.delete(key);
  }

  clear(): void {
    this.records.clear();
  }

  get size(): number {
    return this.records.size;
  }
}
