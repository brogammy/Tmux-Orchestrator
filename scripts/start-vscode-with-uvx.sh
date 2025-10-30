#!/usr/bin/env bash
# Start VS Code with the repository's `bin` directory added to PATH so local shims (like `uvx`) are found.
# Usage: ./scripts/start-vscode-with-uvx.sh

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$REPO_ROOT/bin:$PATH"

if command -v code >/dev/null 2>&1; then
  echo "Starting VS Code with updated PATH (uvx available) ..."
  exec code "$@" "$REPO_ROOT"
else
  echo "Could not find 'code' in PATH. Please install VS Code CLI or start VS Code from this shell:" >&2
  echo "  export PATH=\"$REPO_ROOT/bin:\$PATH\"" >&2
  echo "  code ." >&2
  exit 2
fi
