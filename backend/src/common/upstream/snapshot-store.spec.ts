import { SnapshotStore } from './snapshot-store';
import type { SnapshotPolicy } from './snapshot-store';

const POLICY: SnapshotPolicy = {
  freshMs: 1_000,
  maxStaleMs: 10_000,
  failureCooldownMs: () => 5_000,
  describeFailure: (error) => error.message,
};

function setup() {
  let now = 0;
  const store = new SnapshotStore<string>(2, () => now);
  const calls: string[] = [];
  const loader = (result: string | Error) => () => {
    calls.push(String(result));
    return result instanceof Error
      ? Promise.reject(result)
      : Promise.resolve({ value: result, retrievedAt: `t${now}` });
  };
  return { store, calls, loader, advance: (ms: number) => (now += ms) };
}

describe('SnapshotStore', () => {
  it('serves fresh values without calling the loader again', async () => {
    const { store, calls, loader, advance } = setup();
    expect(await store.read('k', loader('v1'), POLICY)).toEqual({
      value: 'v1',
      retrievedAt: 't0',
      stale: false,
    });
    advance(999);
    expect((await store.read('k', loader('v2'), POLICY)).value).toBe('v1');
    expect(calls).toEqual(['v1']);
  });

  it('refreshes after freshMs and serves the last good value as stale when refresh fails', async () => {
    const { store, loader, advance } = setup();
    await store.read('k', loader('v1'), POLICY);
    advance(2_000);
    const read = await store.read(
      'k',
      loader(new Error('jolpica timeout')),
      POLICY,
    );
    expect(read).toEqual({
      value: 'v1',
      retrievedAt: 't0',
      stale: true,
      staleReason: 'jolpica timeout',
    });
  });

  it('respects the failure cooldown and re-reports the failure when nothing usable exists', async () => {
    const { store, calls, loader, advance } = setup();
    await expect(
      store.read('k', loader(new Error('down')), POLICY),
    ).rejects.toThrow('down');
    advance(1_000);
    await expect(store.read('k', loader('v1'), POLICY)).rejects.toThrow('down');
    expect(calls).toEqual(['Error: down']);
    advance(5_000);
    expect((await store.read('k', loader('v1'), POLICY)).value).toBe('v1');
  });

  it('stops serving stale data after maxStaleMs', async () => {
    const { store, loader, advance } = setup();
    await store.read('k', loader('v1'), POLICY);
    advance(11_001);
    await expect(
      store.read('k', loader(new Error('still down')), POLICY),
    ).rejects.toThrow('still down');
  });

  it('coalesces concurrent refreshes and evicts the oldest key beyond capacity', async () => {
    const { store, calls, loader } = setup();
    const [a, b] = await Promise.all([
      store.read('a', loader('va'), POLICY),
      store.read('a', loader('va2'), POLICY),
    ]);
    expect([a.value, b.value]).toEqual(['va', 'va']);
    expect(calls).toEqual(['va']);
    await store.read('b', loader('vb'), POLICY);
    await store.read('c', loader('vc'), POLICY);
    expect(store.values().sort()).toEqual(['vb', 'vc']);
  });
});
