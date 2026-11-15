// Text rules for counts (HANDOFF.md section 5, item G, decided 2026-11-14).

export interface DayCounts {
  total: number;
  done: number;
  /** Sessions in progress now. A day that has one has started. */
  live?: number;
}

/**
 * Today cell text: nothing started `N to go`; partly done or live `N left` (N = not finished);
 * all finished `N done`. A day without sessions has no text.
 */
export function todayCellLabel(counts: DayCounts): string {
  if (counts.total <= 0) return '';
  if (counts.done >= counts.total) return `${counts.total} done`;
  if (counts.done === 0 && !(counts.live && counts.live > 0)) return `${counts.total} to go`;
  return `${counts.total - counts.done} left`;
}

export function sessionCountLabel(count: number): string {
  return count === 1 ? '1 session' : `${count} sessions`;
}

/** "+1 day" / "−1 day" next to a start time. Empty when the clocks are on the same day. */
export function dayOffsetLabel(offset: number): string {
  if (offset === 0) return '';
  const unit = Math.abs(offset) === 1 ? 'day' : 'days';
  return `${offset > 0 ? '+' : '−'}${Math.abs(offset)} ${unit}`;
}

/** Divider text at the end of a day group. Empty for zero. */
export function afterMidnightLabel(count: number): string {
  if (count <= 0) return '';
  return count === 1 ? '1 session starts after midnight' : `${count} sessions start after midnight`;
}
