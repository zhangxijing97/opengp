import assert from 'node:assert/strict';
import test from 'node:test';
import { BASE_PATH, decodeParam, routes } from './routes';

function allRoutes(): string[] {
  return [
    routes.home, routes.search, routes.searchIndex, routes.settings, routes.signIn, routes.allSeries,
    routes.series('formula-1'), routes.round('f1:2026:mexico-city'), routes.session('f1:2026:mexico-city:race'),
    routes.about, routes.data, routes.contact, routes.legal('terms'),
  ];
}

test('every route is a rooted path without a double slash', () => {
  for (const route of allRoutes()) {
    assert.ok(route.startsWith('/'), route);
    assert.ok(!route.includes('//'), route);
  }
});

test('the home route is the site root, also with an empty prefix', () => {
  assert.equal(BASE_PATH, '');
  assert.equal(routes.home, '/');
});

test('routes match the folders of the (site) group', () => {
  assert.equal(routes.search, '/search');
  assert.equal(routes.searchIndex, '/search-index');
  assert.equal(routes.series('wec'), '/series/wec');
  assert.equal(routes.legal('privacy'), '/legal/privacy');
});

test('ids keep their colons readable and param decoding is safe', () => {
  assert.equal(routes.round('f1:2026:mexico-city'), '/rounds/f1:2026:mexico-city');
  assert.equal(routes.session('f1:2026:são-paulo:race'), '/sessions/f1:2026:s%C3%A3o-paulo:race');
  assert.equal(decodeParam('f1%3A2026%3Ax'), 'f1:2026:x');
  assert.equal(decodeParam('50%'), '50%');
});
