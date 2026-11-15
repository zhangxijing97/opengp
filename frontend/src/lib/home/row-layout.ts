import type { RowState, Tier } from './types';

// The two row layouts the Home can draw today, and their heights (Figma, component SessionRow and
// the day schedules of the three Homes). The ticket of a day schedule is as tall as its rows, so
// the heights are needed to draw the first version of the ticket on the server.
//   single: tiers T3 and T4. One line: plate, event, session, time. 40px, 41px with the separator.
//   multi:  tiers T1 and T2. Two lines (three while live). A finished main race (T1) with a top three
//           shows the podium box and is 114px high (the design's "race" variant).
// T5 (sub-sessions) has no row.

export type RowKind = 'single' | 'multi';

export function rowKindOf(tier: Tier): RowKind | null {
  switch (tier) {
    case 'T1':
    case 'T2':
      return 'multi';
    case 'T3':
    case 'T4':
      return 'single';
    default:
      return null;
  }
}

/** What decides the height of a row. `podium`: a finished main race with a top three (the podium box). */
export interface RowShape {
  kind: RowKind;
  state: RowState;
  podium?: boolean;
}

/** The podium box of a finished main race: only T1, only finished, only when the API sent a top three. */
export function hasPodium(row: { tier: Tier; state: RowState; result?: { rows?: readonly unknown[] } }): boolean {
  return row.tier === 'T1' && row.state === 'done' && (row.result?.rows?.length ?? 0) > 0;
}

/** Height in px. The first row of a card has no separator on top. */
export function rowHeight(kind: RowKind, state: RowState, first: boolean, podium = false): number {
  if (kind === 'single') return first ? 40 : 41;
  if (podium) return 114;
  return state === 'live' ? 87 : 69;
}

export function cardHeight(rows: readonly RowShape[]): number {
  return rows.reduce((sum, row, index) => sum + rowHeight(row.kind, row.state, index === 0, row.podium ?? false), 0);
}

/**
 * The stub shows the weekday, the day and the month from y 16 to y 79. A card shorter than this would let
 * the month hang out of it, so a card is never shorter (a day with one row, 40 to 69px). The rows sit in the
 * middle of the space. TODO(design): the design has no card this short; its smallest is 209px.
 */
export const MIN_CARD_HEIGHT = 96;

/** The height of the ticket: the rows, but at least MIN_CARD_HEIGHT. */
export function ticketHeight(rows: readonly RowShape[]): number {
  return Math.max(cardHeight(rows), MIN_CARD_HEIGHT);
}

/**
 * The stub of a day schedule shows the session count at the bottom. Under this height it would
 * overlap the date at the top, so the count is left out (the week track still shows it).
 * TODO(design): the design has no card this short.
 */
export const MIN_STUB_FOOTER_HEIGHT = 132;
