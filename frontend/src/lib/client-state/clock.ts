'use client';

import { useSyncExternalStore } from 'react';

// The current time as a React value. The server render and the first browser render use the time the
// server gave (so they match); after that the value follows the clock, rounded to the minute, and
// every component that reads it renders again when the minute changes.
const subscribe = (listener: () => void) => {
  const id = window.setInterval(listener, 30_000);
  return () => window.clearInterval(id);
};
const clientNow = () => Math.floor(Date.now() / 60_000) * 60_000;

export function useNow(serverNowMs: number): number {
  return useSyncExternalStore(subscribe, clientNow, () => serverNowMs);
}
