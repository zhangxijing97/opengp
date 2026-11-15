'use client';

import { CollapseIcon, SectionAllSeriesIcon, SectionFollowingIcon } from './home-icons';

// The header above a group of day schedules (Figma component SectionHeader): an icon, the title, the
// number of sessions of the week, and the arrow that collapses the group.
export function SectionHeader({
  kind,
  count,
  expanded,
  onToggle,
}: {
  kind: 'following' | 'all-series';
  /** For example "15 sessions this week". */
  count: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const title = kind === 'following' ? 'Following' : 'All series';
  return (
    <div className="flex items-center gap-2 pt-2 pr-3 pl-2">
      <h2 className="text-section-title flex flex-1 items-center gap-2">
        {kind === 'following' ? <SectionFollowingIcon /> : <SectionAllSeriesIcon />}
        {title}
      </h2>
      <span className="text-section-count text-text-tertiary">{count}</span>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${title} sessions`}
        className="inline-flex size-4.5 items-center justify-center"
      >
        <CollapseIcon size={18} open={expanded} />
      </button>
    </div>
  );
}
