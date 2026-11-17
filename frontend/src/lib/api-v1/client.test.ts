import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { apiGet, getRounds } from './client';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function hangingFetch(): { signals: AbortSignal[] } {
  const signals: AbortSignal[] = [];
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      if (init?.signal) {
        signals.push(init.signal);
        init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }
    })) as typeof fetch;
  return { signals };
}

test('without a limit nothing is aborted and the answer is read as before', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ data: { ok: 1 }, meta: { availability: 'available' } }), { status: 200 })) as typeof fetch;
  const result = await apiGet<{ ok: number }>('/x');
  assert.ok(result.ok && result.data.ok === 1);
});

test('a limit stops a request that never answers and says TIMEOUT', async () => {
  const { signals } = hangingFetch();
  const result = await apiGet('/x', { timeoutMs: 30 });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'TIMEOUT');
    assert.equal(result.error.status, null);
  }
  assert.equal(signals.length, 1);
  assert.equal(signals[0].aborted, true);
});

test('the limit covers reading the body too', async () => {
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        init?.signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')));
      },
    });
    return Promise.resolve(new Response(body, { status: 200 }));
  }) as typeof fetch;
  const result = await apiGet('/x', { timeoutMs: 30 });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'TIMEOUT');
});

test('a fast answer clears the timer and a network error is still NETWORK, not TIMEOUT', async () => {
  globalThis.fetch = (async () => {
    throw new Error('connect ECONNREFUSED');
  }) as typeof fetch;
  const result = await apiGet('/x', { timeoutMs: 5_000 });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'NETWORK');
});

test('getRounds passes the limit on', async () => {
  hangingFetch();
  const result = await getRounds({ from: '2026-11-02', to: '2026-11-09', tz: 'UTC' }, { timeoutMs: 30 });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'TIMEOUT');
});
