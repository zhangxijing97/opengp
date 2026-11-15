import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SERIES_THEMES,
  TOP_SERIES_IDS,
  frontendSeriesId,
  themeById,
} from './series-theme';

test('the design has 28 distinct series', () => {
  assert.equal(SERIES_THEMES.length, 28);
  assert.equal(new Set(SERIES_THEMES.map((theme) => theme.id)).size, 28);
  assert.equal(new Set(SERIES_THEMES.map((theme) => theme.name)).size, 28);
});

test('the list is alphabetical like the "All series" list of the design', () => {
  const names = SERIES_THEMES.map((theme) => theme.name);
  const sorted = [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  assert.deepEqual(names, sorted);
});

test('the top list points at existing series', () => {
  assert.equal(TOP_SERIES_IDS.length, 8);
  for (const id of TOP_SERIES_IDS) assert.ok(themeById(id), id);
});

test('the 8 plate series use plate tokens, all others a hex colour', () => {
  const plated = SERIES_THEMES.filter((theme) => theme.plateCode);
  assert.equal(plated.length, 8);
  for (const theme of plated) assert.match(theme.color, /^var\(--color-series-[a-z0-9-]+\)$/, theme.id);
  for (const theme of SERIES_THEMES.filter((item) => !item.plateCode)) {
    assert.match(theme.color, /^#[0-9A-F]{6}$/, theme.id);
  }
});

test('API ids map to frontend ids', () => {
  assert.equal(frontendSeriesId('f1'), 'formula-1');
  assert.equal(frontendSeriesId('unknown-series'), 'unknown-series');
});

test('plate codes are the ones drawn in the design', () => {
  const codes = Object.fromEntries(SERIES_THEMES.filter((t) => t.plateCode).map((t) => [t.id, t.plateCode]));
  assert.deepEqual(codes, {
    'formula-1': 'F1',
    'formula-e': 'Formula E',
    'gtwc-america': 'GTWC AM',
    'gtwc-europe': 'GTWC EU',
    indycar: 'IndyCar',
    motogp: 'MotoGP',
    nascar: 'NASCAR',
    wec: 'WEC',
  });
});
