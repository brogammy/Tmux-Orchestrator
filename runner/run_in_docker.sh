#!/usr/bin/env bash
# Runner script: runs code in language-specific docker image
# args: language workdir timeout(ms)
set -euo pipefail
lang="$1"
workdir="$2"
timeout_ms="${3:-10000}"
# Convert to seconds for docker --stop-timeout
timeout_s=$(( (timeout_ms + 999) / 1000 ))

case "$lang" in
  python)
    image="python:3.11-slim"
    cmd=(python3 code.py)
    ;;
  node|javascript)
    image="node:18-slim"
    cmd=(node code.js)
    ;;
  *)
    echo "Unsupported language: $lang" >&2
    exit 2
    ;;
esac

# Run docker (requires docker available on host). Use resource limits and disable network.
# Mount the workdir read-only except the code file (we rely on a temp dir).
exec docker run --rm \
  --network none \
  --cpus="0.5" \
  --memory="256m" \
  --pids-limit=64 \
  -v "$workdir":/work:ro \
  -w /work \
  --stop-timeout "$timeout_s" \
  "$image" /bin/sh -c "timeout ${timeout_s}s ${cmd[*]}"
