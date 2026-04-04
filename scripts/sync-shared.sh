#!/bin/bash
set -euo pipefail

# Sync shared/ → each skill's references/ only when the target file is missing.
# Called automatically by pre-commit hook. Also safe to run manually.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
SHARED_DIR="$REPO_DIR/shared"

# Files to sync into each skill's references/.
# Generic shared docs use `shared-*` targets so skills can keep their own
# `environment.md` / `error-handling.md` without being overwritten.
SYNC_SPECS=(
  "environment.md:shared-environment.md"
  "error-handling.md:shared-error-handling.md"
)

changed=0

for skill_dir in "$REPO_DIR"/skills/*/; do
  [ -d "$skill_dir" ] || continue
  refs_dir="$skill_dir/references"
  mkdir -p "$refs_dir"

  for spec in "${SYNC_SPECS[@]}"; do
    src_name="${spec%%:*}"
    dst_name="${spec##*:}"
    src="$SHARED_DIR/$src_name"
    dst="$refs_dir/$dst_name"
    [ -f "$src" ] || continue

    if [ ! -f "$dst" ]; then
      cp "$src" "$dst"
      git add "$dst" 2>/dev/null || true
      changed=1
    fi
  done
done

if [ $changed -eq 1 ]; then
  echo "sync-shared: added missing shared references to skill directories"
fi
