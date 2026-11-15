import assert from 'node:assert/strict';
import test from 'node:test';
import type { RoundSummary } from '../api-v1/types';
import {
  groupHits,
  idPath,
  normalize,
  roundEntries,
  searchEntries,
  seriesEntries,
  tokensOf,
} from './search';

const base = '';

function round(id: string, name: string, location: string): RoundSummary {
  return {
    id,
    seasonId: 'f1:2026',
    series: { id: 'f1', name: 'Formula 1' },
    name,
    roundNumber: null,
    circuit: null,
    locationLabel: location,
    trackTimeZone: null,
    startsAt: null,
    endsAt: null,
    status: 'scheduled',
    statusBasis: 'time_inferred',
    sessions: [],
  };
}

test('normalize removes accents and punctuation', () => {
  assert.equal(normalize('São Paulo Grand-Prix!'), 'sao paulo grand prix');
  assert.deepEqual(tokensOf('  Monaco   GP '), ['monaco', 'gp']);
  assert.deepEqual(tokensOf('!!!'), []);
});

test('an empty query finds nothing', () => {
  assert.deepEqual(searchEntries(seriesEntries(base), ''), []);
  assert.deepEqual(searchEntries(seriesEntries(base), '   '), []);
});

test('typing f1 puts Formula 1 before F1 Academy', () => {
  const hits = searchEntries(seriesEntries(base), 'f1');
  assert.equal(hits[0].entry.title, 'Formula 1');
  assert.ok(hits.some((hit) => hit.entry.title === 'F1 Academy'));
});

test('prefix, alias and substring matching on series', () => {
  const entries = seriesEntries(base);
  assert.deepEqual(
    searchEntries(entries, 'moto').slice(0, 3).map((hit) => hit.entry.title),
    ['Moto2', 'Moto3', 'MotoGP'],
  );
  assert.equal(searchEntries(entries, 'wsbk')[0].entry.title, 'WorldSBK');
  assert.equal(searchEntries(entries, 'endurance')[0].entry.title, 'WEC');
  assert.equal(searchEntries(entries, 'zzzz').length, 0);
});

test('every query word must match (AND)', () => {
  const entries = roundEntries(
    [round('f1:2026:mexico-city', 'Mexico City Grand Prix', 'Mexico City, Mexico'),
     round('f1:2026:monaco', 'Monaco Grand Prix', 'Monte Carlo, Monaco')],
    base,
  );
  assert.deepEqual(searchEntries(entries, 'grand prix').map((h) => h.entry.id).sort(), ['f1:2026:mexico-city', 'f1:2026:monaco']);
  assert.deepEqual(searchEntries(entries, 'grand mexico').map((h) => h.entry.id), ['f1:2026:mexico-city']);
  assert.deepEqual(searchEntries(entries, 'carlo').map((h) => h.entry.id), ['f1:2026:monaco']);
  assert.deepEqual(searchEntries(entries, 'grand zzz'), []);
});

test('hrefs and grouping', () => {
  const entries = [...seriesEntries(base), ...roundEntries([round('f1:2026:são-paulo', 'São Paulo Grand Prix', 'São Paulo')], base)];
  const hits = searchEntries(entries, 'sao');
  const groups = groupHits(hits);
  assert.equal(groups.series.length, 0);
  assert.equal(groups.round.length, 1);
  assert.equal(groups.round[0].entry.href, '/rounds/f1:2026:s%C3%A3o-paulo');
  assert.equal(idPath('f1:2026:china:fp1'), 'f1:2026:china:fp1');
  assert.equal(seriesEntries(base).find((e) => e.id === 'formula-1')?.href, '/series/formula-1');
  assert.equal(seriesEntries(base).find((e) => e.id === 'formula-1')?.subtitle, undefined);
  assert.equal(seriesEntries(base).find((e) => e.id === 'wec')?.subtitle, 'Coming soon');
});

test('a prefix is put in front of every href', () => {
  assert.equal(seriesEntries('/v2').find((entry) => entry.id === 'wec')?.href, '/v2/series/wec');
  assert.equal(roundEntries([round('f1:2026:monaco', 'Monaco Grand Prix', 'Monaco')], '/v2')[0].href, '/v2/rounds/f1:2026:monaco');
});

test('the limit is respected', () => {
  assert.equal(searchEntries(seriesEntries(base), 'a', 5).length, 5);
});
