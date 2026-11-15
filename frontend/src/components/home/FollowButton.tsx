'use client';

import { toggleFollow, useFollowing } from '../../lib/client-state/following';
import { StarIcon } from './icons';

// The star that follows a series. Stored in this browser (decision Q9). The designed star lives
// inside the series list items; this is the plain stand-alone version. TODO(design).
export function FollowButton({ seriesId, name }: { seriesId: string; name: string }) {
  const following = useFollowing().seriesIds.includes(seriesId);
  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={following ? `Unfollow ${name}` : `Follow ${name}`}
      onClick={() => toggleFollow(seriesId)}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-(--radius-full) text-icon-muted hover:bg-surface-inset aria-pressed:text-brand-amber"
    >
      <StarIcon filled={following} />
    </button>
  );
}
