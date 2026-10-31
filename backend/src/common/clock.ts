// Injectable clock so time-dependent logic (lifecycle inference, cache TTLs)
// is deterministic in tests. Production uses the system clock.

export type Clock = () => number;

export const CLOCK = Symbol('OPENGP_CLOCK');

export const systemClock: Clock = () => Date.now();
