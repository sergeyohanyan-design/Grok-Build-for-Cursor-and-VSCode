#!/usr/bin/env bash
# Uninstall Grok Build for Cursor and VSCode on macOS / Linux / WSL.
# Usage:  ./scripts/uninstall.sh
# Prefers Cursor, then VS Code. Does not remove the upstream Marketplace extension.

set -euo pipefail

EXTENSION_ID="SergeyOhanyan.grok-build"

find_editor_clis() {
    local found=()
    for name in cursor cursor-insiders code code-insiders; do
        if command -v "$name" >/dev/null 2>&1; then
            found+=("$name")
        fi
    done
    for path in \
        "/Applications/Cursor.app/Contents/Resources/app/bin/cursor" \
        "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" \
        "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders" \
    ; do
        if [ -x "$path" ]; then
            local already=0
            for f in "${found[@]+"${found[@]}"}"; do
                [ "$f" = "$path" ] && already=1
            done
            [ "$already" -eq 0 ] && found+=("$path")
        fi
    done
    if [ "${#found[@]}" -eq 0 ]; then
        echo "Could not find Cursor or VS Code CLI. Install Cursor (recommended) or VS Code, or add 'cursor' / 'code' to PATH." >&2
        return 1
    fi
    printf '%s\n' "${found[@]}"
}

while IFS= read -r cli; do
    echo "Uninstalling $EXTENSION_ID via $cli"
    "$cli" --uninstall-extension "$EXTENSION_ID" 2>/dev/null || true
done < <(find_editor_clis)
echo
echo "Done. Reload the window to drop the sidebar."
