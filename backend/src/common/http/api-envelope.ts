// Success / error envelopes for /api/v1 only. Legacy /events/* routes keep
// their unwrapped JSON shapes and never pass through these helpers.

import type { Availability, SourceRef } from '../../canonical/canonical.types';

export type ApiErrorCode =
  | 'INVALID_QUERY'
  | 'NOT_FOUND'
  | 'UNSUPPORTED_CAPABILITY'
  | 'RATE_LIMITED'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UPSTREAM_BAD_RESPONSE'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface CoverageEntry {
  seriesId: string;
  availability: Availability;
  reason?: string;
}

export interface ApiMeta {
  availability: Availability;
  /** ISO 8601 UTC; when the oldest source used was checked. */
  retrievedAt: string;
  sources: SourceRef[];
  coverage?: CoverageEntry[];
  warnings: string[];
}

export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; details?: string[] };
  meta: {
    availability: Availability;
    retrievedAt: string;
    sources: SourceRef[];
  };
}

export function dedupeSources(sources: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  const result: SourceRef[] = [];
  for (const source of sources) {
    const key = `${source.provider}|${source.capability}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ provider: source.provider, capability: source.capability });
  }
  return result;
}

export function buildMeta(input: {
  availability: Availability;
  retrievedAt: string;
  sources: SourceRef[];
  coverage?: CoverageEntry[];
  warnings?: string[];
}): ApiMeta {
  const meta: ApiMeta = {
    availability: input.availability,
    retrievedAt: input.retrievedAt,
    sources: dedupeSources(input.sources),
    warnings: [...new Set(input.warnings ?? [])],
  };
  if (input.coverage) meta.coverage = input.coverage;
  return meta;
}

export function earliestIso(values: string[], fallback: string): string {
  return values.length === 0
    ? fallback
    : values.reduce((min, value) => (value < min ? value : min));
}
