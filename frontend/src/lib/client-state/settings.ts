'use client';

import { useSyncExternalStore } from 'react';
import { isValidTimeZone } from '../home/week';
import { SETTINGS_KEY } from './keys';
import { createPersistentStore } from './store';

export interface Settings {
  /** IANA time zone chosen by the user, or null for the browser's own. */
  timeZone: string | null;
  /** Hide the results of finished sessions (the finished-row variant is not designed yet). */
  spoilerFree: boolean;
}

const DEFAULT_SETTINGS: Settings = { timeZone: null, spoilerFree: false };

function parseSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS;
  const value = raw as Record<string, unknown>;
  const timeZone =
    typeof value.timeZone === 'string' && isValidTimeZone(value.timeZone)
      ? value.timeZone
      : null;
  return { timeZone, spoilerFree: value.spoilerFree === true };
}

export const settingsStore = createPersistentStore<Settings>(
  SETTINGS_KEY,
  DEFAULT_SETTINGS,
  parseSettings,
);

export function useSettings(): Settings {
  return useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.read,
    settingsStore.readServer,
  );
}

export function updateSettings(patch: Partial<Settings>): void {
  settingsStore.write({ ...settingsStore.read(), ...patch });
}

/** The browser's time zone (client only). */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** The time zone to show times in: the user's choice, else the browser's. */
export function effectiveTimeZone(settings: Settings): string {
  return settings.timeZone ?? browserTimeZone();
}
