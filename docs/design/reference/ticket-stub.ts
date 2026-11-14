/**
 * Reference implementation: shapes of the "day schedule" ticket card.
 *
 * The card height depends on how many session rows it holds, so the three vector
 * shapes (card base, stub, outline) must be generated per height. This is the exact
 * geometry used in the Figma file (page 05 > section 8 / day-schedule layers).
 *
 * Geometry (px), card width W = 648 by default, stub width 56:
 *  - outer corners: radius 24
 *  - notch: a half circle of radius 6 cut into the top edge and the bottom edge, centred on x = 56
 *  - holes: circles of radius 1.9 centred on x = 56, at y = 20 + 7 * k, k = 0 .. floor((H - 42) / 7)
 *    (half of each hole bites into the stub, half into the card face)
 *
 * Expected hole counts (use as unit-test fixtures): H = 245 -> 30, H = 554 -> 74.
 *
 * Rendering notes:
 *  - cardBase and cardOutline use fill-rule "evenodd"; holes and notches must show the PAGE background,
 *    never a white disc drawn on top.
 *  - Row containers on top of the card must have a TRANSPARENT background, otherwise they cover half of
 *    every hole and half of each notch (this was a real bug in the design file).
 *  - Colours: card face color-surface-card, stub color-brand-amber (today) or color-brand-indigo-light
 *    (not today), outline 1px color-border-default.
 */
export const STUB = {
  cardWidth: 648,
  stubWidth: 56,
  cornerRadius: 24,
  notchRadius: 6,
  holeRadius: 1.9,
  holeFirstY: 20,
  holePitch: 7,
  holeBottomClearance: 22,
} as const;

export type TicketShape = {
  /** path for the white card face (outline + holes, evenodd) */
  cardBase: string;
  /** path for the coloured stub (left 56px, scalloped right edge, evenodd not needed) */
  stubBase: string;
  /** path for the 1px outline stroke (same geometry as cardBase) */
  cardOutline: string;
  holeCount: number;
};

const f3 = (n: number) => Math.round(n * 1000) / 1000;

export function holeCenters(height: number): number[] {
  const last = Math.floor((height - 42) / STUB.holePitch);
  return Array.from({ length: last + 1 }, (_, k) => STUB.holeFirstY + STUB.holePitch * k);
}

function outlinePath(H: number, W: number): string {
  let d =
    `M 24 0 L 50 0 C 50 3.309 52.69 6 56 6 C 59.309 6 62 3.309 62 0 L ${W - 24} 0 ` +
    `C ${f3(W - 10.74)} 0 ${W} 10.739 ${W} 24 L ${W} ${f3(H - 24)} ` +
    `C ${W} ${f3(H - 10.739)} ${f3(W - 10.74)} ${H} ${W - 24} ${H} L 62 ${H} ` +
    `C 62 ${f3(H - 3.309)} 59.309 ${H - 6} 56 ${H - 6} C 52.69 ${H - 6} 50 ${f3(H - 3.309)} 50 ${H} ` +
    `L 24 ${H} C 10.739 ${H} 0 ${f3(H - 10.739)} 0 ${H - 24} L 0 24 C 0 10.739 10.739 0 24 0 Z`;
  for (const c of holeCenters(H)) {
    d +=
      ` M 57.9 ${c} C 57.9 ${f3(c + 1.049)} 57.049 ${f3(c + 1.9)} 56 ${f3(c + 1.9)}` +
      ` C 54.951 ${f3(c + 1.9)} 54.1 ${f3(c + 1.049)} 54.1 ${c}` +
      ` C 54.1 ${f3(c - 1.049)} 54.951 ${f3(c - 1.9)} 56 ${f3(c - 1.9)}` +
      ` C 57.049 ${f3(c - 1.9)} 57.9 ${f3(c - 1.049)} 57.9 ${c} Z`;
  }
  return d;
}

function stubPath(H: number): string {
  const centers = holeCenters(H);
  let d = `M 24 0 L 50 0 C 50 3.309 52.69 6 56 6 L 56 ${f3(centers[0] - 1.9)}`;
  centers.forEach((c, i) => {
    d +=
      ` C 54.951 ${f3(c - 1.9)} 54.1 ${f3(c - 1.05)} 54.1 ${c}` +
      ` C 54.1 ${f3(c + 1.049)} 54.951 ${f3(c + 1.9)} 56 ${f3(c + 1.9)}`;
    d += i < centers.length - 1 ? ` L 56 ${f3(centers[i + 1] - 1.9)}` : ` L 56 ${H - 6}`;
  });
  d +=
    ` C 52.69 ${H - 6} 50 ${f3(H - 3.309)} 50 ${H} L 24 ${H} ` +
    `C 10.739 ${H} 0 ${f3(H - 10.739)} 0 ${H - 24} L 0 24 C 0 10.739 10.739 0 24 0 Z`;
  return d;
}

export function buildTicketShape(height: number, width: number = STUB.cardWidth): TicketShape {
  const H = Math.round(height);
  return {
    cardBase: outlinePath(H, width),
    stubBase: stubPath(H),
    cardOutline: outlinePath(H, width),
    holeCount: holeCenters(H).length,
  };
}

// Sanity checks (move into a real unit test):
//   holeCenters(245).length === 30   // 20, 27, ... 223
//   holeCenters(554).length === 74   // 20, 27, ... 531
