#!/usr/bin/env bash
# Link knowledge panel.css font paths (knowledge/fonts/mathjax) to bundled MathJax webfonts.
set -euo pipefail
REMOTION_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TURN_USER="$(cd "$REMOTION_DIR/../../../codetree/turn/turn-user" && pwd)"
ROOT="$TURN_USER/language_server/vscode_extension/src/visualization/knowledge"
FONTS_LINK="$ROOT/fonts/mathjax"
FONTS_TARGET="$ROOT/render/fonts/mathjax"
AST_ROOT="$TURN_USER/language_server/vscode_extension/src/visualization/ast"
AST_FONTS_LINK="$AST_ROOT/fonts/mathjax"
mkdir -p "$ROOT/fonts"
if [ ! -e "$FONTS_LINK" ]; then
  ln -s ../render/fonts/mathjax "$FONTS_LINK"
fi
mkdir -p "$AST_ROOT/fonts"
if [ ! -e "$AST_FONTS_LINK" ]; then
  ln -s ../../knowledge/render/fonts/mathjax "$AST_FONTS_LINK"
fi
if [ ! -d "$FONTS_TARGET" ]; then
  echo "Missing MathJax fonts at $FONTS_TARGET" >&2
  exit 1
fi
