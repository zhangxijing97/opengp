'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { searchEntries } from '../../lib/home/search';
import type { SearchEntry } from '../../lib/home/search';
import { SearchIcon } from './icons';

// The search field of the top nav (Figma component SearchField) with a type-ahead.
// Without JavaScript the form still works: it submits to the search page.
// With JavaScript the field follows the WAI-ARIA combobox pattern with a listbox popup:
// arrow keys move, Enter opens the active suggestion or searches, Escape closes, "/" focuses.
// The look of the popup is not drawn in the design: TODO(design).

interface IndexResponse {
  entries: SearchEntry[];
  warning: string | null;
}

const MAX_SUGGESTIONS = 8;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function SearchBox({ searchPath, indexPath }: { searchPath: string; indexPath: string }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const loading = useRef(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [index, setIndex] = useState<IndexResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  // "/" focuses the field, as the key chip says, unless the user is typing somewhere.
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function loadIndex() {
    if (index || loading.current) return;
    loading.current = true;
    fetch(indexPath)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<IndexResponse>;
      })
      .then((data) => {
        setIndex(data);
        setLoadFailed(false);
      })
      .catch(() => {
        setLoadFailed(true);
        loading.current = false; // try again on the next focus
      });
  }

  const hits = useMemo(
    () => (index ? searchEntries(index.entries, query, MAX_SUGGESTIONS) : []),
    [index, query],
  );
  const showPopup = open && query.trim().length > 0;

  function go(href: string) {
    // The index comes from our own server; still, only a path on this site is ever opened.
    if (!href.startsWith('/') || href.startsWith('//')) return;
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    router.push(href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!showPopup) setOpen(true);
        else if (hits.length > 0) setActive((active + 1) % hits.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (showPopup && hits.length > 0) setActive(active <= 0 ? hits.length - 1 : active - 1);
        break;
      case 'Escape':
        if (showPopup) {
          event.preventDefault();
          setOpen(false);
          setActive(-1);
        } else if (query) {
          setQuery('');
        }
        break;
      case 'Enter':
        if (showPopup && active >= 0 && hits[active]) {
          event.preventDefault();
          go(hits[active].entry.href);
        }
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  }

  const status = !showPopup
    ? ''
    : loadFailed
      ? 'Suggestions are unavailable. Press Enter to search.'
      : !index
        ? 'Loading suggestions'
        : hits.length === 0
          ? 'No suggestions. Press Enter to search.'
          : `${hits.length} suggestions`;

  return (
    <form
      role="search"
      action={searchPath}
      method="get"
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setActive(-1);
        }
      }}
    >
      <div className="flex h-9 w-41 items-center gap-2 rounded-control border border-text-on-brand/35 bg-text-on-brand/12 pr-2 pl-3 focus-within:w-72 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-text-on-brand">
        <SearchIcon className="shrink-0 text-text-on-brand" />
        <input
          ref={inputRef}
          type="text"
          name="q"
          value={query}
          placeholder="Search"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search series and events"
          role="combobox"
          aria-expanded={showPopup}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-option-${active}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => {
            loadIndex();
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="text-section-count min-w-0 flex-1 bg-transparent text-text-on-brand outline-none placeholder:text-text-on-brand"
        />
        <span
          aria-hidden="true"
          className="text-week-sub inline-flex size-4 shrink-0 items-center justify-center rounded-micro border border-text-on-brand/35 text-text-on-brand"
        >
          /
        </span>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      {showPopup ? (
        <div className="absolute top-full left-0 z-10 mt-2 w-72 overflow-hidden rounded-control border border-border-default bg-surface-card text-text-primary shadow-attached">
          {loadFailed || !index || hits.length === 0 ? (
            <p className="text-caption px-3 py-3 text-text-secondary">{status}</p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Suggestions">
              {hits.map((hit, position) => (
                <li
                  key={`${hit.entry.kind}-${hit.entry.id}`}
                  id={`${listId}-option-${position}`}
                  role="option"
                  aria-selected={position === active}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(position)}
                  onClick={() => go(hit.entry.href)}
                  className="cursor-pointer px-3 py-2 aria-selected:bg-surface-inset"
                >
                  <span className="text-list-item block truncate">{hit.entry.title}</span>
                  <span className="text-caption block truncate text-text-secondary">
                    {hit.entry.kind === 'series' ? 'Series' : 'Event'}
                    {hit.entry.subtitle ? `, ${hit.entry.subtitle}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {index?.warning ? (
            <p className="text-caption border-t border-border-separator px-3 py-2 text-text-amber">
              {index.warning}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
