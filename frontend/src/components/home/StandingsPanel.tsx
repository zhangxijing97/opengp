// The right column (Figma component SidebarStandings). The standings need the results data, which the
// API does not have yet, so the panel keeps its place and its title and says so. The tabs, the
// table and the season ruler of the design come with the data. TODO(design)
export function StandingsPanel() {
  return (
    <aside aria-label="Standings" className="w-72 shrink-0 rounded-surface border border-border-default bg-surface-card">
      <h2 className="text-series-title px-4 pt-3.5 pb-2">Formula 1</h2>
      <p className="text-footer-body px-4 pb-5 text-text-secondary">
        Standings are not available yet. They arrive with the results data.
      </p>
    </aside>
  );
}
