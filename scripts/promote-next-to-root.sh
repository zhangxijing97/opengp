#!/usr/bin/env bash
# Moves the new site from /next to the root of the site.
#
# Order:
#   1. Unzip opengp-promote-to-root.zip over the repository. It adds frontend/src/app/(site)/
#      (the pages that used to be in frontend/src/app/next/) and updates a few files.
#   2. Run this script from anywhere inside the repository.
#   3. cd frontend && npm run lint && npm run build, then commit.
#
# Removed (the new site replaces them, or they only existed as the preview copy):
#   frontend/src/app/next/        the preview copy; its pages are now in frontend/src/app/(site)/
#   frontend/src/app/page.tsx     old Home    -> the new Home at /
#   frontend/src/app/about/       old About   -> the new About at /about
#   frontend/src/app/events/      old placeholder event page -> /rounds/[roundId]
#   frontend/src/app/sessions/    old session page -> /sessions/[sessionId] (new; the old [id] name clashes)
# Kept: frontend/src/app/news/ (no replacement yet), every old component, src/lib/api.ts, the mock data.
#
# Options:
#   --keep-old-home   keep the old Home at / until the new Home is built. The placeholder Home
#                     of the new site, frontend/src/app/(site)/page.tsx, is removed instead.
#   --yes             do not ask for confirmation.
set -euo pipefail

KEEP_OLD_HOME=0
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --keep-old-home) KEEP_OLD_HOME=1 ;;
    --yes) ASSUME_YES=1 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

ROOT="$(git rev-parse --show-toplevel)"
APP="$ROOT/frontend/src/app"

if [ ! -f "$APP/(site)/layout.tsx" ]; then
  echo "frontend/src/app/(site)/layout.tsx is missing. Unzip opengp-promote-to-root.zip over the repository first." >&2
  exit 1
fi

TARGETS=("$APP/next" "$APP/about" "$APP/events" "$APP/sessions")
if [ "$KEEP_OLD_HOME" -eq 1 ]; then
  TARGETS+=("$APP/(site)/page.tsx")
else
  TARGETS+=("$APP/page.tsx")
fi

echo "These will be removed:"
EXISTING=()
for target in "${TARGETS[@]}"; do
  if [ -e "$target" ]; then
    echo "  ${target#"$ROOT"/}"
    EXISTING+=("$target")
  else
    echo "  (not there, skipped) ${target#"$ROOT"/}"
  fi
done

if [ "${#EXISTING[@]}" -eq 0 ]; then
  echo "Nothing to remove."
  exit 0
fi

if [ "$ASSUME_YES" -ne 1 ]; then
  read -r -p "Remove them? [y/N] " answer
  case "$answer" in
    y|Y|yes|YES) ;;
    *) echo "Nothing was removed."; exit 1 ;;
  esac
fi

rm -rf "${EXISTING[@]}"

echo
echo "Done. Next: cd frontend && npm run lint && npm run build"
echo "Then find old code that nothing imports any more, for example: npx knip"
git -C "$ROOT" status --short | head -40
