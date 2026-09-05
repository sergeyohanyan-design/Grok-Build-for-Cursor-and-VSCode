# Uninstall Grok Build for Cursor and VSCode on Windows.
# Usage:  pwsh scripts\uninstall.ps1
# Prefers Cursor, then VS Code. Does not remove the upstream Marketplace extension.

$ErrorActionPreference = "Stop"

$ExtensionId = "SergeyOhanyan.grok-build"

function Find-EditorClis {
    $found = [System.Collections.Generic.List[string]]::new()
    foreach ($name in @("cursor", "cursor-insiders", "code", "code-insiders")) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd) { $found.Add($cmd.Source) }
    }
    foreach ($fallback in @(
        "$env:LOCALAPPDATA\Programs\cursor\resources\app\bin\cursor.cmd",
        "$env:LOCALAPPDATA\Programs\Cursor\resources\app\bin\cursor.cmd",
        "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd",
        "$env:LOCALAPPDATA\Programs\Microsoft VS Code Insiders\bin\code-insiders.cmd"
    )) {
        if ((Test-Path $fallback) -and -not ($found -contains $fallback)) {
            $found.Add($fallback)
        }
    }
    if ($found.Count -eq 0) {
        throw "Could not find Cursor or VS Code CLI. Install Cursor (recommended) or VS Code, or add 'cursor' / 'code' to PATH."
    }
    return $found
}

foreach ($cli in Find-EditorClis) {
    Write-Host "Uninstalling $ExtensionId via $cli"
    & $cli --uninstall-extension $ExtensionId 2>$null
}
Write-Host ""
Write-Host "Done. Reload the window to drop the sidebar."
