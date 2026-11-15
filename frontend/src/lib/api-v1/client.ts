import type {
  ApiMeta,
  DateBasis,
  RoundDetailData,
  RoundsListData,
  SessionDetailData,
  SessionResultsData,
  StandingsResponseData,
  StandingsSubjectType,
} from './types';

// Typed reads of the OpenGP backend. Unlike the legacy src/lib/api.ts, a failure is
// never turned into an empty list: every call returns either data or an explicit error.

export type ApiResult<T> =
  | { ok: true; data: T; meta: ApiMeta }
  | { ok: false; error: ApiFailure };

export interface ApiFailure {
  /** Backend error code, or NETWORK / INVALID_RESPONSE when the backend did not answer properly. */
  code: string;
  message: string;
  /** HTTP status, or null when there was no response. */
  status: number | null;
}

export function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, { cache: 'no-store' });
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'NETWORK',
        message: error instanceof Error ? error.message : 'The request failed.',
        status: null,
      },
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      error: {
        code: 'INVALID_RESPONSE',
        message: 'The server did not return JSON.',
        status: response.status,
      },
    };
  }

  if (!response.ok) {
    const error = isRecord(body) && isRecord(body.error) ? body.error : null;
    return {
      ok: false,
      error: {
        code: typeof error?.code === 'string' ? error.code : 'HTTP_ERROR',
        message:
          typeof error?.message === 'string'
            ? error.message
            : `The server answered with HTTP ${response.status}.`,
        status: response.status,
      },
    };
  }

  if (!isRecord(body) || !('data' in body)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_RESPONSE',
        message: 'The response has no data envelope.',
        status: response.status,
      },
    };
  }
  return { ok: true, data: body.data as T, meta: body.meta as ApiMeta };
}

export interface RoundsQuery {
  from: string;
  to: string;
  tz: string;
  seriesId?: string;
  /** `track` groups a race weekend by the date at the venue (the Home week view); default `viewer`. */
  dateBasis?: DateBasis;
}

export function getRounds(query: RoundsQuery): Promise<ApiResult<RoundsListData>> {
  const params = new URLSearchParams({ from: query.from, to: query.to, tz: query.tz });
  if (query.seriesId) params.set('seriesId', query.seriesId);
  if (query.dateBasis) params.set('dateBasis', query.dateBasis);
  return apiGet<RoundsListData>(`/api/v1/rounds?${params.toString()}`);
}

export function getRound(roundId: string): Promise<ApiResult<RoundDetailData>> {
  return apiGet<RoundDetailData>(`/api/v1/rounds/${encodeURIComponent(roundId)}`);
}

export function getSession(sessionId: string): Promise<ApiResult<SessionDetailData>> {
  return apiGet<SessionDetailData>(`/api/v1/sessions/${encodeURIComponent(sessionId)}`);
}

export function getSessionResults(sessionId: string): Promise<ApiResult<SessionResultsData>> {
  return apiGet<SessionResultsData>(`/api/v1/sessions/${encodeURIComponent(sessionId)}/results`);
}

export interface StandingsQuery {
  /** For example `f1:2026`. */
  seasonId: string;
  subjectType: StandingsSubjectType;
}

export function getStandings(query: StandingsQuery): Promise<ApiResult<StandingsResponseData>> {
  const params = new URLSearchParams({ seasonId: query.seasonId, subjectType: query.subjectType });
  return apiGet<StandingsResponseData>(`/api/v1/standings?${params.toString()}`);
}
