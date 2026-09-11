#!/bin/bash
# Re-places native .node binaries where package loaders expect them.
# Run after any clean `npm install` (see NATIVE-BINDINGS.md).
set -e
cd "$(dirname "$0")/.."

OXIDE_SRC="node_modules/@tailwindcss/oxide-linux-x64-gnu/tailwindcss-oxide.linux-x64-gnu.node"
OXIDE_DST="node_modules/@tailwindcss/oxide/"
LIGHT_SRC="node_modules/lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node"
LIGHT_DST="node_modules/lightningcss/"

if [ -f "$OXIDE_SRC" ]; then
  cp "$OXIDE_SRC" "$OXIDE_DST" && echo "placed oxide binding"
else
  echo "MISSING: $OXIDE_SRC (run npm install first)"
fi

if [ -f "$LIGHT_SRC" ]; then
  cp "$LIGHT_SRC" "$LIGHT_DST" && echo "placed lightningcss binding"
else
  echo "MISSING: $LIGHT_SRC (run npm install first)"
fi
