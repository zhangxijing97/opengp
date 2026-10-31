// Minimal runtime guards for untrusted provider JSON. Parsers built from these
// throw ShapeError; provider clients convert it into UpstreamError
// ('bad_response') so malformed data never becomes a silent empty result.

export class ShapeError extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(`${path}: ${message}`);
    this.name = 'ShapeError';
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function expectRecord(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (!isRecord(value)) throw new ShapeError(path, 'expected an object');
  return value;
}

export function expectArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new ShapeError(path, 'expected an array');
  return value as unknown[];
}

export function expectString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw new ShapeError(path, 'expected a string');
  }
  return value;
}

export function optionalString(
  value: unknown,
  path: string,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  return expectString(value, path);
}

/** Accepts a JSON integer or an integer encoded as a string (Ergast style). */
export function expectIntegerLike(value: unknown, path: string): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
  throw new ShapeError(path, 'expected an integer');
}

export function optionalIntegerLike(
  value: unknown,
  path: string,
): number | null {
  if (value === undefined || value === null) return null;
  return expectIntegerLike(value, path);
}

export function optionalBoolean(value: unknown, path: string): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'boolean') {
    throw new ShapeError(path, 'expected a boolean');
  }
  return value;
}
