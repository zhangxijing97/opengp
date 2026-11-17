'use client';

import { useEffect, useState } from 'react';

/**
 * True once `active` has been true for `ms` milliseconds, and false again as soon as it is not active.
 * For things that should appear only when something takes a while ("Still loading...", dimming), so a fast
 * answer does not make the page flicker.
 */
export function useDelayedFlag(active: boolean, ms: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => setElapsed(true), ms);
    return () => {
      window.clearTimeout(id);
      setElapsed(false);
    };
  }, [active, ms]);
  return active && elapsed;
}
