// A tiny persistent store for React's useSyncExternalStore, backed by localStorage.
// Server render and the first client render use `fallback`; the stored value arrives after
// hydration without a mismatch. All storage access is guarded: private mode or a full disk
// must never break a page.

export interface PersistentStore<T> {
  read: () => T;
  write: (next: T) => void;
  /** Forget the stored value and go back to the fallback. */
  clear: () => void;
  subscribe: (listener: () => void) => () => void;
  readServer: () => T;
}

export function createPersistentStore<T>(
  key: string,
  fallback: T,
  parse: (raw: unknown) => T,
): PersistentStore<T> {
  let cache: T | undefined;
  const listeners = new Set<() => void>();

  function read(): T {
    if (typeof window === 'undefined') return fallback;
    if (cache !== undefined) return cache;
    try {
      const raw = window.localStorage.getItem(key);
      cache = raw === null ? fallback : parse(JSON.parse(raw));
    } catch {
      cache = fallback;
    }
    return cache;
  }

  function notify(): void {
    listeners.forEach((listener) => listener());
  }

  function write(next: T): void {
    cache = next;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Keep the in-memory value for this visit.
    }
    notify();
  }

  function clear(): void {
    cache = fallback;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Nothing to remove.
    }
    notify();
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      // Another tab changed the value (or cleared storage).
      if (event.key === key || event.key === null) {
        cache = undefined;
        listener();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }

  return { read, write, clear, subscribe, readServer: () => fallback };
}
