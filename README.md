# Grok Build GUI (enhanced fork)

Independent VS Code sidebar for the [Grok Build CLI](https://grok.x.ai/) over the Agent Client Protocol.

This is a **maintained fork** of [SahilRakhaiya05/Grok-Build-GUI](https://github.com/SahilRakhaiya05/Grok-Build-GUI). It keeps the upstream chat, plan mode, and ACP host, and adds the Windows-first improvements that the Marketplace build stubs or overwrites.

**Not affiliated with, endorsed by, or maintained by xAI.**

## Why this fork exists

The Marketplace VSIX ships a **stubbed voice build** and a chat surface that loses copy/paste and file-attach on Windows. This fork is the full local build (`MARKETPLACE_BUNDLE=0`) with those gaps closed:

| Area | What this fork does |
|------|---------------------|
| **Voice** | Windows `System.Speech` STT by default (no API key, no ffmpeg). Optional SAPI TTS after a voice-submitted turn. xAI cloud STT remains as a fallback. |
| **Chat clipboard** | `Ctrl/Cmd+C V X A Z Y` work in the sidebar. Host `vscode.env.clipboard` bridge + keybindings so the workbench cannot steal the shortcuts. Layout-safe (`e.code`), including non-Latin keyboards. |
| **Attach / paste** | File picker selects **files** (not folders-only). Drag-drop normalizes `/C:/…` paths. Path-less drops and `Ctrl+V` screenshots become temp chips. |
| **Vision** | Image chips go out as ACP `{ type: "image", mimeType, data }` blocks, not `@path` only. |
| **Scroll** | After tool rounds, new agent text opens **below** the tool group so the latest work stays visible. |

Upstream Marketplace packaging still strips voice on purpose. Install this repo from source if you want the features above.

## Requirements

- VS Code 1.94+ (Cursor works the same way)
- [Grok CLI](https://grok.x.ai/) installed and signed in (`grok /login`)
- Windows Desktop speech recognizer for the default voice engine (e.g. `MS-1033-80-DESK`)

## Features

Upstream:

- Agent chat sidebar with plan, agent, and YOLO modes
- File context, session history, and edit approvals
- Model picker and reasoning effort controls

Added in this fork:

- Windows system voice input and optional reply TTS
- Hands-free submit phrase (default `grok send`)
- Chat copy / paste / cut / select-all / undo / redo
- Screenshot and file paste, drag-drop, and ACP vision
- Windows file-picker and path-normalization fixes
- Tool-round scroll that keeps the latest agent work on screen

## Install from source

Do **not** expect these patches from the Marketplace listing.

```bat
git clone https://github.com/sergeyohanyan-design/Grok-Build-GUI.git
cd Grok-Build-GUI
npm.cmd install
set MARKETPLACE_BUNDLE=0
npm.cmd run bundle:dev
```

Then copy the built host into the installed extension folder (adjust the version folder if needed):

```bat
copy /Y dist\extension.js %USERPROFILE%\.vscode\extensions\sahilrakhaiya.grok-build-gui-1.0.4\dist\extension.js
copy /Y media\chat.js     %USERPROFILE%\.vscode\extensions\sahilrakhaiya.grok-build-gui-1.0.4\media\chat.js
```

If you also use Cursor, copy the same two files into:

`%USERPROFILE%\.cursor\extensions\sahilrakhaiya.grok-build-gui-1.0.4\`

Reload the window: **Developer: Reload Window**.

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
set MARKETPLACE_BUNDLE=0
npm.cmd run bundle:dev
```

Always build with `MARKETPLACE_BUNDLE=0`. A Marketplace bundle will stub voice again.

## Support

- This fork: https://github.com/sergeyohanyan-design/Grok-Build-GUI
- Upstream: https://github.com/SahilRakhaiya05/Grok-Build-GUI

## License

MIT — Copyright (c) 2026 Sahil Rakhaiya

This fork keeps the original license and attribution. Local enhancements in this repository are also MIT.
