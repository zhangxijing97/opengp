import assert from 'node:assert/strict';
import test from 'node:test';
import type { Availability, Lifecycle } from '../api-v1/types';
import { basisNote, lifecycleLabel, resultNote, roundStatusLabel } from './status-text';

test('every lifecycle has a label', () => {
  const all: Lifecycle[] = ['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed', 'unknown'];
  const labels = all.map(lifecycleLabel);
  assert.equal(new Set(labels).size, all.length);
  assert.equal(lifecycleLabel('in_progress'), 'In progress');
});

test('every availability has a sentence and none claims results exist unless they do', () => {
  const all: Availability[] = [
    'available', 'partial', 'not_published', 'not_applicable',
    'unsupported', 'access_restricted', 'unknown', 'upstream_error',
  ];
  for (const availability of all) assert.ok(resultNote(availability).endsWith('.'), availability);
  assert.equal(resultNote('unknown'), 'Results are not available in OpenGP yet.');
  assert.equal(resultNote('upstream_error'), 'Results could not be loaded.');
});

test('round status and basis wording', () => {
  assert.equal(roundStatusLabel('ongoing'), 'Under way');
  assert.equal(basisNote('provider'), null);
  assert.match(basisNote('time_inferred') ?? '', /not live timing/);
});
