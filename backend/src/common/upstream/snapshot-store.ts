// Per-key "last known good" snapshot store for upstream data.
//
// - fresh:  served without calling upstream.
// - stale:  after `freshMs`, a refresh is attempted; if it fails, the previous
//           value is served (flagged stale) for up to `maxStaleMs` more.
// - cooldown: after a failure, upstream is not called again until the
//           cooldown ends; the failure is re-reported (never turned into an
//           empty success) unless a usable stale value exists.
// Concurrent reads of the same key share one upstream call.

export interface SnapshotPolicy {
  freshMs: number;
  maxStaleMs: number;
  failureCooldownMs: (error: Error) => number;
  describeFailure: (error: Error) => string;
}

export interface SnapshotRead<T> {
  value: T;
  retrievedAt: string;
  stale: boolean;
  /** Why a stale value was served (set only when stale). */
  staleReason?: string;
}

interface Snapshot<T> {
  value: T;
  retrievedAt: string;
  fetchedAtMs: number;
}

interface Entry<T> {
  snapshot: Snapshot<T> | null;
  failure: { error: Error; retryNotBeforeMs: number } | null;
}

export type SnapshotLoader<T> = () => Promise<{
  value: T;
  retrievedAt: string;
}>;

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export class SnapshotStore<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private readonly inFlight = new Map<string, Promise<SnapshotRead<T>>>();

  constructor(
    private readonly maxEntries: number,
    private readonly now: () => number = Date.now,
  ) {}

  read(
    key: string,
    loader: SnapshotLoader<T>,
    policy: SnapshotPolicy,
  ): Promise<SnapshotRead<T>> {
    const nowMs = this.now();
    const entry = this.entries.get(key);
    const snapshot = entry?.snapshot ?? null;

    if (snapshot && nowMs - snapshot.fetchedAtMs < policy.freshMs) {
      return Promise.resolve({
        value: snapshot.value,
        retrievedAt: snapshot.retrievedAt,
        stale: false,
      });
    }

    const usable =
      snapshot &&
      nowMs - snapshot.fetchedAtMs < policy.freshMs + policy.maxStaleMs
        ? snapshot
        : null;

    if (entry?.failure && nowMs < entry.failure.retryNotBeforeMs) {
      return usable
        ? Promise.resolve(this.staleRead(usable, entry.failure.error, policy))
        : Promise.reject(entry.failure.error);
    }

    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const request = this.refresh(key, loader, policy, usable).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, request);
    return request;
  }

  /** Values currently held (fresh or stale), for cache-first lookups. */
  values(): T[] {
    return [...this.entries.values()]
      .map((entry) => entry.snapshot?.value)
      .filter((value): value is T => value !== undefined);
  }

  private async refresh(
    key: string,
    loader: SnapshotLoader<T>,
    policy: SnapshotPolicy,
    usable: Snapshot<T> | null,
  ): Promise<SnapshotRead<T>> {
    try {
      const loaded = await loader();
      this.store(key, {
        snapshot: {
          value: loaded.value,
          retrievedAt: loaded.retrievedAt,
          fetchedAtMs: this.now(),
        },
        failure: null,
      });
      return {
        value: loaded.value,
        retrievedAt: loaded.retrievedAt,
        stale: false,
      };
    } catch (caught) {
      const error = asError(caught);
      this.store(key, {
        snapshot: usable,
        failure: {
          error,
          retryNotBeforeMs: this.now() + policy.failureCooldownMs(error),
        },
      });
      if (usable) return this.staleRead(usable, error, policy);
      throw error;
    }
  }

  private staleRead(
    snapshot: Snapshot<T>,
    error: Error,
    policy: SnapshotPolicy,
  ): SnapshotRead<T> {
    return {
      value: snapshot.value,
      retrievedAt: snapshot.retrievedAt,
      stale: true,
      staleReason: policy.describeFailure(error),
    };
  }

  private store(key: string, entry: Entry<T>): void {
    this.entries.delete(key);
    while (this.entries.size >= this.maxEntries) {
      const [oldest] = this.entries.keys();
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
    this.entries.set(key, entry);
  }
}
