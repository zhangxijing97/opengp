// Shapes of the day schedule ticket (HANDOFF.md appendix, "Reference implementation"). The card
// height depends on its rows, so the three shapes are generated per height: the white card face
// with the notches and the holes, the coloured stub with its scalloped right edge, and the
// outline. Holes and notches show the page behind the card; nothing is painted over them.
//
// Geometry (px), card width 648, stub width 56: outer corners 24; a half circle of radius 6 cut
// into the top and the bottom edge at x = 56; holes of radius 1.9 at x = 56 and y = 20 + 7k.
// One difference from the reference: below 42px there is no room for a hole, and the stub path
// is a straight line there instead of failing.

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

export interface TicketShape {
  /** The white card face: outline and holes, fill-rule evenodd. */
  cardBase: string;
  /** The coloured stub: the left 56px, with a scalloped right edge. */
  stubBase: string;
  /** The 1px outline: the same geometry as the card face. */
  cardOutline: string;
  holeCount: number;
}

const f3 = (n: number) => Math.round(n * 1000) / 1000;

export function holeCenters(height: number): number[] {
  const last = Math.floor((height - 42) / STUB.holePitch);
  if (last < 0) return [];
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
  let d = `M 24 0 L 50 0 C 50 3.309 52.69 6 56 6`;
  if (centers.length === 0) {
    d += ` L 56 ${H - 6}`;
  } else {
    d += ` L 56 ${f3(centers[0] - 1.9)}`;
    centers.forEach((c, i) => {
      d +=
        ` C 54.951 ${f3(c - 1.9)} 54.1 ${f3(c - 1.05)} 54.1 ${c}` +
        ` C 54.1 ${f3(c + 1.049)} 54.951 ${f3(c + 1.9)} 56 ${f3(c + 1.9)}`;
      d += i < centers.length - 1 ? ` L 56 ${f3(centers[i + 1] - 1.9)}` : ` L 56 ${H - 6}`;
    });
  }
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
