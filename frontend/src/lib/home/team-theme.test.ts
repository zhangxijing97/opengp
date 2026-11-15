import assert from 'node:assert/strict';
import test from 'node:test';
import { teamColour } from './team-theme';

test('team colours of the design, from an OpenGP id or from a name', () => {
  assert.equal(teamColour('f1:team:mercedes'), '#00A19B');
  assert.equal(teamColour('Mercedes'), '#00A19B');
  assert.equal(teamColour('f1:team:ferrari'), '#E8002D');
  assert.equal(teamColour('f1:team:red-bull'), '#3671C6');
  assert.equal(teamColour('Red Bull Racing'), '#3671C6');
  assert.equal(teamColour('McLaren'), '#FF8000');
  assert.equal(teamColour('f1:team:rb'), '#6692FF');
  assert.equal(teamColour('RB F1 Team'), '#6692FF');
  assert.equal(teamColour('Alpine F1 Team'), '#0093CC');
  assert.equal(teamColour('Aston Martin'), '#229971');
});

test('the rest of the 2026 grid', () => {
  assert.equal(teamColour('Haas F1 Team'), '#9CA3AF');
  assert.equal(teamColour('Audi'), '#B91C1C');
  assert.equal(teamColour('Kick Sauber'), '#B91C1C');
  assert.equal(teamColour('Williams'), '#64C4FF');
  assert.equal(teamColour('Cadillac'), '#111827');
});

test('an unknown or missing team is neutral, never a wrong colour', () => {
  assert.equal(teamColour('Some Future Team'), 'var(--color-dot-inactive)');
  assert.equal(teamColour(''), 'var(--color-dot-inactive)');
  assert.equal(teamColour(null), 'var(--color-dot-inactive)');
  assert.equal(teamColour(undefined), 'var(--color-dot-inactive)');
});
