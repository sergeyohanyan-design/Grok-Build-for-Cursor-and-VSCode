# Grok Build for Cursor and VSCode

Sidebar for the [Grok Build CLI](https://grok.x.ai/) over the Agent Client Protocol. Built first for **Cursor** (where Grok has no good sidebar). It also runs in VS Code.

**Not affiliated with, endorsed by, or maintained by xAI.**

Based on [SahilRakhaiya05/Grok-Build-GUI](https://github.com/SahilRakhaiya05/Grok-Build-GUI) (MIT).

## Why this exists

Cursor does not ship a Grok Build sidebar. This is a full ACP host — voice, copy/paste, attach, and vision included — published under `SergeyOhanyan.grok-build`. It is not a patch on the upstream Marketplace stub.

| Area | What you get |
|------|----------------|
| **Voice** | Windows `System.Speech` STT by default (no API key, no ffmpeg). Optional SAPI TTS after a voice-submitted turn. xAI cloud STT remains as a fallback. |
| **Chat clipboard** | `Ctrl/Cmd+C V X A Z Y` work in the sidebar. Host clipboard bridge + keybindings so the workbench cannot steal the shortcuts. Layout-safe (`e.code`), including non-Latin keyboards. |
| **Attach / paste** | File picker selects **files** (not folders-only). Drag-drop normalizes `/C:/…` paths. Path-less drops and `Ctrl+V` screenshots become temp chips. |
| **Vision** | Image chips go out as ACP `{ type: "image", mimeType, data }` blocks, not `@path` only. |
| **Scroll** | After tool rounds, new agent text opens **below** the tool group so the latest work stays visible. |

## Requirements

- Cursor  (recommended) or VS Code 1.94+
- [Grok CLI](https://grok.x.ai/) installed and signed in (`grok /login`)
- Windows Desktop speech recognizer for the default voice engine (e.g. `MS-1033-80-DESK`)

## Features

- Agent chat sidebar with plan, agent, and YOLO modes
- File context, session history, and edit approvals
- Model picker and reasoning effort controls
- Windows system voice input and optional reply TTS
- Hands-free submit phrase (default `grok send`)
- Chat copy / paste / cut / select-all / undo / redo
- Screenshot and file paste, drag-drop, and ACP vision

## Install

Extension id: `SergeyOhanyan.grok-build`

### Cursor (recommended)

Search **Grok Build for Cursor and VSCode** in Cursor’s Extensions panel, or:

```
cursor --install-extension SergeyOhanyan.grok-build
```

Cursor (and VSCodium / Windsurf) pull from [Open VSX](https://open-vsx.org/extension/SergeyOhanyan/grok-build).

### VS Code

```
code --install-extension SergeyOhanyan.grok-build
```

[VS Code Marketplace listing](https://marketplace.visualstudio.com/items?itemName=SergeyOhanyan.grok-build)

### From a GitHub Release (VSIX)

1. Download `grok-build-1.0.5.vsix` from [Releases](https://github.com/sergeyohanyan-design/Grok-Build-for-Cursor-and-VSCode/releases).
2. In Cursor or VS Code: **Extensions → … → Install from VSIX…**
3. Reload the window.

A hand-installed `.vsix` does not auto-update. Install from Open VSX / Marketplace when you want updates.

### From source

```bat
git clone https://github.com/sergeyohanyan-design/Grok-Build-for-Cursor-and-VSCode.git "Grok Build for Cursor and VSCode"
cd "Grok Build for Cursor and VSCode"
npm.cmd install
npm.cmd run package
cursor --install-extension grok-build-1.0.5.vsix
```

Or `pwsh scripts\install.ps1` — it prefers the Cursor CLI, then VS Code.

Reload: **Developer: Reload Window**.

## Voice

| Setting | Meaning |
|---------|---------|
| `grok.voiceEngine` | `auto` (default): Windows speech on Windows, otherwise xAI. `windows` / `xai` force one engine. |
| `grok.voiceTts` | Speak the agent reply after a **voice-submitted** turn (Windows SAPI). Default `true`. |
| `grok.voiceSendPhrase` | Trailing phrase that submits the composer. Default `grok send`. Empty disables. |
| `grok.voiceApiKey` | Only for the xAI engine. Falls back to `GROK_VOICE_API_KEY` or `XAI_API_KEY`. |
| `grok.ffmpegPath` / `grok.voiceInputDevice` / `grok.voiceStreaming` | xAI engine only. |

Windows engine: use the default microphone, pause about half a second after a phrase so Desktop speech can commit. Debug in **View → Output → Grok** — look for `[voice:win] ready`, `listening...`, `heard ...`.

The Windows listener uses a **sync** `Recognize()` loop and a **stop-file**. Async recognition events are not reliable under redirected PowerShell.

## Attach, paste, and vision

| Action | Result |
|--------|--------|
| `+` → Upload files | Native **file** dialog (not folders only) |
| Drag a file onto chat | Chip appears |
| `Ctrl+V` a screenshot | Chip from a temp file |
| Select transcript text + `Ctrl+C` | Copies the selection (not the editor) |
| Composer `Ctrl+V` / `Ctrl+Z` | Inserts clipboard text / undo |
| Send with an image chip | ACP vision blocks |

Soft caps: about 12 MB per vision encode, about 25 MB per temp attach.

## Settings

- `grok.cliPath` — set this if the Grok CLI is not on your PATH
- Voice and clipboard settings are listed above

## Development

```bat
npm.cmd test
npm.cmd run bundle:dev
npm.cmd run package
```

`npm run package` ships the **full** host (voice included). Set `MARKETPLACE_BUNDLE=1` only if you intentionally want the stubbed scanner build.

GitHub Releases are the VSIX ship path (`pwsh scripts\release.ps1` after a version bump). Open VSX (`npm run publish:ovsx`) and the VS Code Marketplace (`npm run publish`) are manual and separate.

## Support

https://github.com/sergeyohanyan-design/Grok-Build-for-Cursor-and-VSCode

## License

MIT — Copyright (c) 2026 Sahil Rakhaiya and Sergey Ohanyan
