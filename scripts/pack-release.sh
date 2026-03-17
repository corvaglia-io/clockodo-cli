#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/release}"
CACHE_DIR="${NPM_CONFIG_CACHE:-/tmp/clockodo-cli-npm-cache}"

mkdir -p "$OUTPUT_DIR"

pushd "$ROOT_DIR" >/dev/null
rm -f "$OUTPUT_DIR"/clockodo-cli-*.tgz

PACKAGE_FILENAME="$(
  NPM_CONFIG_CACHE="$CACHE_DIR" npm pack --silent
)"

mv "$ROOT_DIR/$PACKAGE_FILENAME" "$OUTPUT_DIR/$PACKAGE_FILENAME"
shasum -a 256 "$OUTPUT_DIR/$PACKAGE_FILENAME"

echo
echo "Packed release artifact:"
echo "  $OUTPUT_DIR/$PACKAGE_FILENAME"
popd >/dev/null
