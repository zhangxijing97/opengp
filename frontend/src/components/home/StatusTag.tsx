// The grey pill of a finished session whose results are not published yet (Figma component StatusTag,
// kind results-pending). The design draws it #F0F0F0; there is no such token, so the nearest surface
// token is used. The rescheduled tag is not built: the API has no field for it.
export function StatusTag() {
  return (
    <span className="text-row-meta inline-flex items-center gap-2 rounded-track bg-surface-inset px-3 py-(--space-off-7) whitespace-nowrap text-text-tertiary">
      <span aria-hidden="true" className="size-1.5 rounded-(--radius-full) bg-icon-subtle" />
      Results pending
    </span>
  );
}
