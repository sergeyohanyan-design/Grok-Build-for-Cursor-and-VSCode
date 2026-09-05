#!/usr/bin/env bash
# Install Grok Build for Cursor and VSCode on macOS / Linux / WSL.
# Usage:  ./scripts/install.sh [path/to/file.vsix]
# Prefers Cursor, then VS Code. Installs into every editor CLI found.
# Picks the first .vsix in the repo root, or builds one if none exists.

set -euo pipefail
repo_root="$(cd "$(dirname "$0")/.." && pwd)"

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

vsix="${1-}"
if [ -z "$vsix" ]; then
    cd "$repo_root"
    [ -d node_modules ] || npm install
    npm run package
    vsix=$(ls "$repo_root"/*.vsix | head -n1)
fi
[ -f "$vsix" ] || { echo "vsix not found: $vsix" >&2; exit 1; }

while IFS= read -r cli; do
    echo "Installing $vsix via $cli"
    "$cli" --install-extension "$vsix"
done < <(find_editor_clis)
echo
echo "Done. Reload the window (Ctrl+Shift+P -> 'Developer: Reload Window') and click the Grok icon."
