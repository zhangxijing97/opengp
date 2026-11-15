'use client';

import { useSyncExternalStore } from 'react';

const subscribeNothing = () => () => {};

/** False on the server and during hydration, true afterwards. Lets a component swap in browser-only text without a mismatch. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNothing, () => true, () => false);
}
