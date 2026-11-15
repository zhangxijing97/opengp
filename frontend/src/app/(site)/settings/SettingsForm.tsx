'use client';

import Link from 'next/link';
import { ClearStoredData } from '../../../components/home/ClearStoredData';
import { Panel, linkClass } from '../../../components/home/page-parts';
import { toggleFollow, useFollowing } from '../../../lib/client-state/following';
import { useHydrated } from '../../../lib/client-state/hydrated';
import { browserTimeZone, updateSettings, useSettings } from '../../../lib/client-state/settings';
import { timeZoneLabel, timeZoneOptions } from '../../../lib/home/format';
import { routes } from '../../../lib/home/routes';
import { themeById } from '../../../lib/home/series-theme';

// Settings as a page, not a pop-up (decision): it has an address, works with the keyboard and
// needs no focus trap. Every change is saved at once. The pop-up version is not designed.
// TODO(design)

const fieldClass =
  'text-footer-body h-9 w-full rounded-control border border-border-default bg-surface-card px-3';

export function SettingsForm() {
  const settings = useSettings();
  const following = useFollowing();
  const hydrated = useHydrated();

  // The zone list is long and browser specific: it is built after hydration.
  const zones = hydrated ? timeZoneOptions() : settings.timeZone ? [settings.timeZone] : [];
  const browserZone = hydrated ? browserTimeZone() : '';

  return (
    <div className="grid gap-4">
      <Panel title="Time zone">
        <label htmlFor="time-zone" className="text-caption mb-1 block text-text-secondary">
          Times are shown in this zone
          {hydrated ? ` (now ${timeZoneLabel(settings.timeZone ?? browserZone)})` : ''}
        </label>
        <select
          id="time-zone"
          className={fieldClass}
          value={settings.timeZone ?? ''}
          onChange={(event) => updateSettings({ timeZone: event.target.value || null })}
        >
          <option value="">{hydrated ? `Browser default (${browserZone})` : 'Browser default'}</option>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </Panel>

      <Panel title="Spoilers">
        <label className="text-footer-body flex items-start gap-3">
          <input
            type="checkbox"
            checked={settings.spoilerFree}
            onChange={(event) => updateSettings({ spoilerFree: event.target.checked })}
            className="mt-0.5 size-4 accent-brand-indigo"
          />
          <span>
            Hide the results of finished sessions
            <span className="text-caption block text-text-secondary">
              Saved now. It takes effect once the finished rows are built; their spoiler-free version is not
              designed yet.
            </span>
          </span>
        </label>
      </Panel>

      <Panel title="Followed series">
        {following.seriesIds.length === 0 ? (
          <p className="text-footer-body text-text-secondary">
            You are not following any series.{' '}
            <Link href={routes.allSeries} className={linkClass}>Find series to follow</Link>.
          </p>
        ) : (
          <ul className="grid gap-2">
            {following.seriesIds.map((id) => {
              const theme = themeById(id);
              return (
                <li key={id} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded-(--radius-full)"
                    style={{ backgroundColor: theme?.color ?? 'var(--color-dot-inactive)' }}
                  />
                  <span className="text-list-item flex-1">{theme?.name ?? id}</span>
                  <button
                    type="button"
                    onClick={() => toggleFollow(id)}
                    className="text-caption text-brand-indigo underline underline-offset-2"
                  >
                    Unfollow
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Stored data">
        <p className="text-footer-body mb-3 text-text-secondary">
          OpenGP keeps your settings and followed series in this browser only. Clearing removes both.
        </p>
        <ClearStoredData />
      </Panel>
    </div>
  );
}
