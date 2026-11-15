import type { RowException, SessionRowVM } from './types';

// The plain version of the row states the design does not draw (decided 2026-11-14,
// docs/design/UNDRAWN.md). TODO(design): replace when the rows are designed.
//   Cancelled, postponed: the row keeps its upcoming layout; the start time is replaced by the
//     word, in the same text style, secondary colour, no strike-through (the same way the design
//     replaces the time left of a live row by "Red flag"). The session no longer counts as
//     something that is going to happen.
//   Unknown: the time stays; a small note says the status is not known.
//   Rescheduled: the API has no field for it, so it is not shown at all.

export interface RowRightText {
  /** Replaces the start time. */
  word: string | null;
  /** A small line under the time. */
  note: string | null;
}

export function exceptionText(exception: RowException | null): RowRightText {
  switch (exception) {
    case 'cancelled':
      return { word: 'Cancelled', note: null };
    case 'postponed':
      return { word: 'Postponed', note: null };
    case 'unknown':
      return { word: null, note: 'Status unknown' };
    default:
      return { word: null, note: null };
  }
}

/** False for a cancelled or postponed session: it is listed, but it is not going to take place. */
export function happens(row: Pick<SessionRowVM, 'exception'>): boolean {
  return row.exception !== 'cancelled' && row.exception !== 'postponed';
}
