#!/bin/sh

set -e

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
FINGERPRINT_PATH="$ROOT_DIR/shared/queens-export-fingerprint.json"

cd "$ROOT_DIR"

CURRENT_FINGERPRINT="$(yarn -s db:print-export-fingerprint)"

if [ -f "$FINGERPRINT_PATH" ]; then
  LAST_FINGERPRINT="$(cat "$FINGERPRINT_PATH")"
  if [ "$CURRENT_FINGERPRINT" = "$LAST_FINGERPRINT" ]; then
    echo "Queens DB-backed exports are already up to date."
    exit 0
  fi
fi

echo "Queens DB-backed exports changed. Syncing artifacts..."
yarn db:export-puzzles-json
yarn db:export-shared-solver-config
printf '%s\n' "$CURRENT_FINGERPRINT" > "$FINGERPRINT_PATH"

git add \
  frontend/public/queens/puzzles.json \
  frontend/public/queens/extendedPuzzles.json \
  shared/queens-solver-config.json \
  shared/queens-export-fingerprint.json

echo "DB-backed Queens exports are synced and staged."
