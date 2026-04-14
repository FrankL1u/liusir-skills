#!/bin/bash
set -euo pipefail

# Publish a single skill to ClawHub
# Usage: ./scripts/publish-skill.sh <skill-name> --version <x.y.z> [--changelog "..."] [--dry-run]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

SKILL_NAME=""
VERSION=""
CHANGELOG="Update"
DRY_RUN=false

read_frontmatter_field() {
  local file="$1"
  local field="$2"

  awk -v target="$field" '
    /^---$/ { block += 1; next }
    block == 1 && $0 ~ ("^" target ":[[:space:]]*") {
      sub("^" target ":[[:space:]]*", "", $0)
      gsub(/^["'"'"']|["'"'"']$/, "", $0)
      print
      exit
    }
  ' "$file"
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --version) VERSION="$2"; shift 2 ;;
    --changelog) CHANGELOG="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    -*) echo "Unknown option: $1"; exit 1 ;;
    *) SKILL_NAME="$1"; shift ;;
  esac
done

if [[ -z "$SKILL_NAME" ]]; then
  echo "Usage: ./scripts/publish-skill.sh <skill-name> --version <x.y.z> [--changelog \"...\"] [--dry-run]"
  echo ""
  echo "Available skills:"
  ls -1 "$REPO_DIR/skills/" | grep -v '^$'
  exit 1
fi

SKILL_DIR="$REPO_DIR/skills/$SKILL_NAME"

if [[ ! -f "$SKILL_DIR/SKILL.md" ]]; then
  echo "Error: $SKILL_DIR/SKILL.md not found"
  exit 1
fi

if [[ -z "$VERSION" ]]; then
  VERSION="$(read_frontmatter_field "$SKILL_DIR/SKILL.md" "version")"
fi

if [[ -z "$VERSION" ]]; then
  # Try to read version from package manifests
  if [[ -f "$SKILL_DIR/package.json" ]]; then
    VERSION=$(grep '"version"' "$SKILL_DIR/package.json" | head -1 | sed 's/.*"version".*"\(.*\)".*/\1/')
  elif [[ -f "$SKILL_DIR/toolkit/package.json" ]]; then
    VERSION=$(grep '"version"' "$SKILL_DIR/toolkit/package.json" | head -1 | sed 's/.*"version".*"\(.*\)".*/\1/')
  fi
  if [[ -z "$VERSION" ]]; then
    echo "Error: --version required (no version found in SKILL.md, package.json, or toolkit/package.json)"
    exit 1
  fi
fi

# Extract display name from SKILL.md frontmatter
DISPLAY_NAME="$(read_frontmatter_field "$SKILL_DIR/SKILL.md" "name")"
if [[ -z "$DISPLAY_NAME" ]]; then
  DISPLAY_NAME="$SKILL_NAME"
fi

# Create temp directory with publishable files only
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Packaging $SKILL_NAME v$VERSION..."

IGNORE_FILE="$SKILL_DIR/.clawhubignore"
RSYNC_EXCLUDES=(--exclude=.git --exclude=__pycache__ --exclude=node_modules --exclude=.DS_Store)

if [[ -f "$IGNORE_FILE" ]]; then
  while IFS= read -r pattern || [[ -n "$pattern" ]]; do
    [[ -z "$pattern" || "$pattern" =~ ^# ]] && continue
    RSYNC_EXCLUDES+=(--exclude="$pattern")
  done < "$IGNORE_FILE"
else
  echo "Warning: $SKILL_DIR/.clawhubignore not found; packaging whole skill directory."
fi

rsync -a "${RSYNC_EXCLUDES[@]}" "$SKILL_DIR/" "$TMP_DIR/"

echo "Files to publish:"
find "$TMP_DIR" -type f | sed "s|^$TMP_DIR/||" | sort | while read -r f; do
  echo "  $f ($(wc -c < "$TMP_DIR/$f" | tr -d ' ') bytes)"
done

if $DRY_RUN; then
  echo ""
  echo "[DRY RUN] Would publish:"
  echo "  slug: $SKILL_NAME"
  echo "  name: $DISPLAY_NAME"
  echo "  version: $VERSION"
  echo "  changelog: $CHANGELOG"
  exit 0
fi

echo ""
echo "Publishing to ClawHub..."
clawhub publish "$TMP_DIR" \
  --slug "$SKILL_NAME" \
  --name "$DISPLAY_NAME" \
  --version "$VERSION" \
  --changelog "$CHANGELOG"

echo ""
echo "✅ Published $SKILL_NAME v$VERSION to ClawHub"
echo "   https://clawhub.ai/skill/$SKILL_NAME"
