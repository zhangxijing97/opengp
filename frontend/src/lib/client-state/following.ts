'use client';

import { useSyncExternalStore } from 'react';
import { FOLLOWING_KEY } from './keys';
import { createPersistentStore } from './store';

export interface Following {
  /** Frontend series ids (see src/lib/home/series-theme.ts). */
  seriesIds: string[];
}

const NOBODY: Following = { seriesIds: [] };

function parseFollowing(raw: unknown): Following {
  if (typeof raw !== 'object' || raw === null) return NOBODY;
  const ids = (raw as Record<string, unknown>).seriesIds;
  if (!Array.isArray(ids)) return NOBODY;
  const clean = ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
  return { seriesIds: [...new Set(clean)] };
}

export const followingStore = createPersistentStore<Following>(
  FOLLOWING_KEY,
  NOBODY,
  parseFollowing,
);

export function useFollowing(): Following {
  return useSyncExternalStore(
    followingStore.subscribe,
    followingStore.read,
    followingStore.readServer,
  );
}

export function toggleFollow(seriesId: string): void {
  const current = followingStore.read().seriesIds;
  const next = current.includes(seriesId)
    ? current.filter((id) => id !== seriesId)
    : [...current, seriesId];
  followingStore.write({ seriesIds: next });
}
