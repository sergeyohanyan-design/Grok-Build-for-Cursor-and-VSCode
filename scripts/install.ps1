# Install Grok Build for Cursor and VSCode on Windows.
# Usage:  pwsh scripts\install.ps1
# Prefers Cursor, then VS Code. Installs into every editor CLI found.
# Picks the first .vsix in the repo root, or builds one if none exists.

param(
    [string]$VsixPath
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

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

if (-not $VsixPath) {
    $vsix = Get-ChildItem -Path $repoRoot -Filter "*.vsix" | Select-Object -First 1
    if (-not $vsix) {
        Write-Host "No .vsix found - building one..."
        Push-Location $repoRoot
        try {
            if (-not (Test-Path "node_modules")) { npm install }
            npm run package
            $vsix = Get-ChildItem -Path $repoRoot -Filter "*.vsix" | Select-Object -First 1
        } finally { Pop-Location }
    }
    if (-not $vsix) { throw "Build did not produce a .vsix." }
    $VsixPath = $vsix.FullName
}

foreach ($cli in Find-EditorClis) {
    Write-Host "Installing $VsixPath via $cli"
    & $cli --install-extension $VsixPath
}
Write-Host ""
Write-Host "Done. Reload the window (Ctrl+Shift+P -> 'Developer: Reload Window') and click the Grok icon."
