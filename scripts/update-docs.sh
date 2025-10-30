#!/usr/bin/env bash
# Regenerate a lightweight docs snapshot (docs/DOCS_AUTOGEN.md)
# Writes current models (from opencode.json) and agencies (from Agencies/*) plus timestamp.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/docs"
OUT_FILE="$OUT_DIR/DOCS_AUTOGEN.md"
mkdir -p "$OUT_DIR"

python3 - <<'PY' > "$OUT_FILE"
import json, os, time
root = os.path.dirname(os.path.dirname(__file__))
opencode = os.path.join(root, 'opencode.json')
models = {}
if os.path.exists(opencode):
    try:
        cfg = json.load(open(opencode))
        providers = cfg.get('providers') or cfg.get('provider') or {}
        ollama = providers.get('ollama', {})
        models = ollama.get('models', {})
    except Exception as e:
        models = {}

ag_dir = os.path.join(root, 'Agencies')
agencies = []
if os.path.isdir(ag_dir):
    for name in sorted(os.listdir(ag_dir)):
        path = os.path.join(ag_dir, name, 'agency.json')
        try:
            data = json.load(open(path))
            agencies.append({'name': data.get('name', name), 'description': data.get('description', '')})
        except Exception:
            agencies.append({'name': name, 'description': ''})

print(f"# Auto-generated docs snapshot\n\nGenerated: {time.asctime()}\n\n## Models (from opencode.json)\n")
if models:
    for m in sorted(models.keys()):
        print(f"- {m}")
else:
    print("(no models found)")

print("\n## Agencies\n")
if agencies:
    for a in agencies:
        print(f"- {a['name']}: {a['description']}")
else:
    print('(no agencies found)')
PY

echo "Wrote $OUT_FILE"
