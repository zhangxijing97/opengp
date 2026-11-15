import type { RoundSummary } from '../api-v1/types';
import { SERIES_THEMES } from './series-theme';

// Search over a small in-memory index (decision: a form that works without JavaScript, plus a
// type-ahead on the same function). Pure and deterministic.

export type SearchKind = 'series' | 'round';

export interface SearchEntry {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  /** Extra words that also match (aliases, venue, series name). */
  keywords: readonly string[];
}

export interface SearchHit {
  entry: SearchEntry;
  score: number;
}

/** Lower case, no accents, letters and digits separated by single spaces. */
export function normalize(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function tokensOf(query: string): string[] {
  const normalized = normalize(query);
  return normalized ? normalized.split(' ') : [];
}

// Score of one token against one normalized field.
function fieldScore(field: string, token: string): number {
  if (!field) return 0;
  if (field === token) return 100;
  if (field.startsWith(token)) return 80;
  if (field.split(' ').some((word) => word.startsWith(token))) return 60;
  if (field.includes(token)) return 35;
  return 0;
}

const KIND_BOOST: Record<SearchKind, number> = { series: 3, round: 2 };
const KEYWORD_WEIGHT = 0.6;
// An alias that equals the word is as good as a title match for typing "f1" or "wsbk".
const EXACT_KEYWORD_SCORE = 95;

function keywordScore(keyword: string, token: string): number {
  if (keyword === token) return EXACT_KEYWORD_SCORE;
  return fieldScore(keyword, token) * KEYWORD_WEIGHT;
}

export function searchEntries(
  entries: readonly SearchEntry[],
  query: string,
  limit = 20,
): SearchHit[] {
  const tokens = tokensOf(query);
  if (tokens.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const entry of entries) {
    const title = normalize(entry.title);
    const keywords = entry.keywords.map(normalize);
    let total = 0;
    let matchedAll = true;
    for (const token of tokens) {
      const best = Math.max(
        fieldScore(title, token),
        ...keywords.map((keyword) => keywordScore(keyword, token)),
      );
      if (best <= 0) {
        matchedAll = false;
        break;
      }
      total += best;
    }
    if (matchedAll) hits.push({ entry, score: total + KIND_BOOST[entry.kind] });
  }

  return hits
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit);
}

export function groupHits(hits: readonly SearchHit[]): Record<SearchKind, SearchHit[]> {
  return {
    series: hits.filter((hit) => hit.entry.kind === 'series'),
    round: hits.filter((hit) => hit.entry.kind === 'round'),
  };
}

/** Path with colons kept readable (round ids look like f1:2026:mexico-city). */
export function idPath(id: string): string {
  return encodeURIComponent(id).replace(/%3A/g, ':');
}

export function seriesEntries(basePath: string): SearchEntry[] {
  return SERIES_THEMES.map((theme) => ({
    kind: 'series' as const,
    id: theme.id,
    title: theme.name,
    subtitle: theme.apiId ? undefined : 'Coming soon',
    href: `${basePath}/series/${theme.id}`,
    keywords: theme.aliases,
  }));
}

export function roundEntries(
  rounds: readonly RoundSummary[],
  basePath: string,
): SearchEntry[] {
  return rounds.map((round) => ({
    kind: 'round' as const,
    id: round.id,
    title: round.name,
    subtitle: [round.series.name, round.locationLabel].filter(Boolean).join(', '),
    href: `${basePath}/rounds/${idPath(round.id)}`,
    keywords: [
      round.series.name,
      round.locationLabel ?? '',
      round.circuit?.name ?? '',
    ].filter(Boolean),
  }));
}
