import { dayOffsetLabel } from '../../lib/home/labels';
import { exceptionText } from '../../lib/home/row-text';
import type { SessionRowVM } from '../../lib/home/types';
import { LocalTime } from './LocalTime';

// The right side of an upcoming session row: the start time (with "+1 day" in front when the visitor's
// calendar is a day ahead of the weekend), or for a cancelled or postponed session the word that
// replaces it (same text style, secondary colour, no strike-through). Under the time, a multi-line row
// shows "ends ~..." (the planned end). Plain version of states the design does not draw: TODO(design).
// `size` picks the design's text style: md for multi-line rows (20px), sm for single-line rows (15px).
export function RowTime({
  row,
  size,
  showEnd = false,
}: {
  row: Pick<SessionRowVM, 'startsAt' | 'endsAt' | 'exception' | 'dayOffset'>;
  size: 'md' | 'sm';
  showEnd?: boolean;
}) {
  const { word, note } = exceptionText(row.exception);
  const style = size === 'md' ? 'text-start-time' : 'text-start-time-sm';
  const offset = word ? '' : dayOffsetLabel(row.dayOffset);
  const ends = showEnd && !word && row.endsAt;
  return (
    <div className="flex shrink-0 flex-col items-end gap-0.5">
      <span className="flex items-baseline gap-1.5">
        {offset ? <span className="text-start-sub text-text-tertiary">{offset}</span> : null}
        {note && size === 'sm' ? <span className="text-start-sub text-text-secondary">{note}</span> : null}
        <span className={word ? `${style} text-text-secondary` : style}>
          {word ?? <LocalTime iso={row.startsAt} mode="time" />}
        </span>
      </span>
      {ends ? (
        <span className="text-start-sub text-text-tertiary">
          ends ~<LocalTime iso={row.endsAt} mode="time" />
        </span>
      ) : null}
      {note && size === 'md' ? <span className="text-start-sub text-text-secondary">{note}</span> : null}
    </div>
  );
}
