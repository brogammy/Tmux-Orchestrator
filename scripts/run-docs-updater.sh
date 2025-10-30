#!/usr/bin/env bash
# Run the docs updater every 30 minutes.
# Keep running in the background or use systemd to manage it.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

while true; do
  echo "[docs-updater] $(date) - regenerating docs"
  ./scripts/update-docs.sh
  echo "[docs-updater] sleeping 1800s"
  sleep 1800
done
