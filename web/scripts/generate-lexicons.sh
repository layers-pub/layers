#!/bin/bash
set -e

echo "Generating TypeScript types from Lexicon schemas using @atproto/lex-cli..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$(dirname "$WEB_DIR")")"

WEB_OUTPUT_DIR="$WEB_DIR/lib/api/generated"
LEXICONS_DIR="$ROOT_DIR/layers/lexicons"
ATPROTO_LEXICONS_DIR="$LEXICONS_DIR/com"

# =============================================================================
# Download ATProto base lexicons if not present
# =============================================================================

if [ ! -d "$ATPROTO_LEXICONS_DIR" ]; then
  echo "Downloading ATProto base lexicons..."
  TEMP_DIR=$(mktemp -d)
  curl -sL "https://github.com/bluesky-social/atproto/archive/refs/heads/main.zip" -o "$TEMP_DIR/atproto.zip"
  unzip -q "$TEMP_DIR/atproto.zip" -d "$TEMP_DIR"

  # Copy only the com/atproto/repo lexicons (needed for record CRUD operations)
  mkdir -p "$LEXICONS_DIR/com/atproto/repo"
  cp "$TEMP_DIR/atproto-main/lexicons/com/atproto/repo/"*.json "$LEXICONS_DIR/com/atproto/repo/"

  rm -rf "$TEMP_DIR"
  echo "Downloaded ATProto base lexicons"
fi

# =============================================================================
# Generate web client types
# =============================================================================

echo "Generating web client types..."
rm -rf "$WEB_OUTPUT_DIR"
mkdir -p "$WEB_OUTPUT_DIR"

pnpm exec lex gen-api --yes "$WEB_OUTPUT_DIR" $(find "$LEXICONS_DIR" -name "*.json" | xargs)

# Remove .js extensions from web client imports.
# Next.js/webpack resolves .ts imports without extensions, but
# @atproto/lex-cli generates with .js for ESM compatibility.
echo "Removing .js extensions from web client imports..."
find "$WEB_OUTPUT_DIR" -name "*.ts" -type f | while read -r file; do
  sed -i.bak -E "s/from '([^']+)\\.js'/from '\\1'/g" "$file"
  rm -f "$file.bak"
done

# Add @ts-nocheck to web client files to suppress strict type errors
echo "Adding @ts-nocheck to web client files..."
find "$WEB_OUTPUT_DIR" -name "*.ts" -type f | while read -r file; do
  if ! grep -q "^// @ts-nocheck" "$file"; then
    echo "// @ts-nocheck" | cat - "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  fi
done

echo "Web client lexicon generation complete: $WEB_OUTPUT_DIR"

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "Lexicon code generation complete"
echo "   Web client: $WEB_OUTPUT_DIR"
