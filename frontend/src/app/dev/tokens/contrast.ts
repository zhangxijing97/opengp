// WCAG 2.x contrast helpers for the /dev/tokens page.
// Only #rgb and #rrggbb colours are supported; anything else returns null.

export type Rgb = readonly [number, number, number];

const HEX_COLOUR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function parseHexColour(value: string): Rgb | null {
  const text = value.trim();
  if (!HEX_COLOUR.test(text)) return null;
  const digits = text.slice(1);
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : digits;
  const packed = Number.parseInt(full, 16);
  return [(packed >> 16) & 0xff, (packed >> 8) & 0xff, packed & 0xff];
}

function linearChannel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(colour: Rgb): number {
  const [red, green, blue] = colour;
  return (
    0.2126 * linearChannel(red) +
    0.7152 * linearChannel(green) +
    0.0722 * linearChannel(blue)
  );
}

/** Contrast ratio between two hex colours (1 to 21), or null if either is not a hex colour. */
export function contrastRatio(
  foreground: string,
  background: string,
): number | null {
  const first = parseHexColour(foreground);
  const second = parseHexColour(background);
  if (!first || !second) return null;
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
