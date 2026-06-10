#!/usr/bin/env bash
# Uninstall the Grok VS Code extension on macOS / Linux / WSL.
# Usage:  ./scripts/uninstall.sh

set -euo pipefail

find_code_cli() {
    for name in code code-insiders; do
        if command -v "$name" >/dev/null 2>&1; then
            echo "$name"; return 0
        fi
    done
    for path in \
        "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" \
        "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders" \
    ; do
        [ -x "$path" ] && { echo "$path"; return 0; }
    done
    echo "Could not find VS Code CLI." >&2
    return 1
}

code=$(find_code_cli)
for id in sahilrakhaiya05.grok-build-gui grok-gui.grok-build-gui grok-gui.grok-vscode-gui; do
  echo "Uninstalling $id via $code"
  "$code" --uninstall-extension "$id" 2>/dev/null || true
done
echo
echo "Done. Reload VS Code to drop the sidebar."
