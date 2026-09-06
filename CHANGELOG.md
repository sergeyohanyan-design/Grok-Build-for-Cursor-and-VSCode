# Changelog

## 1.0.7 — 2026-09-06

> App icon: original Grok mark inside build brackets.

### Changed

- Marketplace, activity bar, and in-chat mark now use the original Grok glyph framed by construction brackets, with the mark large in the center.

### Release

- Always bump the version before publishing. Never replace an existing `vX.Y.Z` VSIX in place.
- GitHub Releases VSIX: `grok-build-1.0.7.vsix`

## 1.0.6 — 2026-09-06

> Slash commands actually run, chat scroll no longer fights you, Node 24 tests collect.

### Fixed

- Slash commands grok advertises over ACP (`/compact`, `/context`, `/session-info`, `/imagine`, skills, …) are sent as the **whole prompt**. The active-file chip no longer wraps `/compact` into a normal chat turn, so grok intercepts the builtin. Command Palette **Grok: Compact Conversation** sends `/compact` instead of a toast. Enter on a slash pick runs it; Tab still completes so you can add args. `/imagine` can still attach a reference photo.
- Chat auto-scroll follows new output **only while you are at the bottom**. Scroll up to read earlier messages while Grok works; scroll back down to catch up.
- `npm test` on Node 24: vitest uses the forks pool so suites collect (was "No test suite found" in every file).

### GitHub Releases VSIX

- `grok-build-1.0.6.vsix`

## 1.0.5 — 2026-08-16

> Independent product **Grok Build for Cursor and VSCode** (`SergeyOhanyan.grok-build`). Based on [SahilRakhaiya05/Grok-Build-GUI](https://github.com/SahilRakhaiya05/Grok-Build-GUI) 1.0.4 (MIT). Full host — voice included. Built first for Cursor; also runs in VS Code.

### Identity

- Publisher `SergeyOhanyan`, extension id `SergeyOhanyan.grok-build`
- Display name **Grok Build for Cursor and VSCode**
- GitHub Releases VSIX: `grok-build-1.0.5.vsix`
- Open VSX and VS Code Marketplace publish are manual and separate
- Does not overlay or share an id with `sahilrakhaiya.grok-build-gui`

### Added

- Windows `System.Speech` STT (sync `Recognize()` + stop-file) and optional SAPI TTS after voice-submitted turns
- `grok.voiceEngine` (`auto` / `windows` / `xai`) plus send-phrase, TTS, and xAI fallback settings
- Chat clipboard + undo: webview `e.code` handlers, host `vscode.env.clipboard` bridge, and `focusedView == grok.chat || grok.chatFocus` keybindings
- ACP screenshot / image vision (`image` content blocks), clipboard image paste, and path-less drag-drop
- Windows file-picker fix (`canSelectFolders: false`) and `/C:/…` drop-path normalization
- Chat scroll so new agent text stays below tool groups

### Docs

- README rewritten for this fork (VSIX install, voice, attach/vision, clipboard)

### Packaging

- Full-build VSIX via `npm run package:fork` (Marketplace stubs are opt-in with `MARKETPLACE_BUNDLE=1`)

## 1.0.4 — 2026-06-10

> Marketplace packaging — strips dev metadata from the VSIX, removes credential-looking sample code and env-file reads, and ships a minimal changelog for validation.

## 1.0.3 — 2026-06-10

> Marketplace-only build — strips voice/STT/WebSocket code and uses a minimal README for security scanning.

## 1.0.2 — 2026-06-10

> Marketplace packaging fix — removed remote install script examples from README and excluded dev artifacts from the VSIX.

## 1.0.1 — 2026-06-10

> Marketplace packaging fix — bundled extension, removed remote-install script strings from the VSIX.

### Fixed

- Bundle extension for Marketplace upload (no `node_modules` in VSIX)
- Sanitize onboarding UI and metadata for Marketplace security scanning

## 1.0.0 — 2026-06-10

> Initial release of Grok Build - XAI by Sahil Rakhaiya.

### Highlights

- VS Code sidebar for `grok agent stdio` over the Agent Client Protocol
- Plan / Agent / YOLO modes with client-side plan-mode enforcement
- Header model picker, effort controls, and session history
- File context chips, voice input, inline image/video generation
- Edit approval cards with diff preview

### Owner

- Repository: [github.com/SahilRakhaiya05/Grok-Build-GUI](https://github.com/SahilRakhaiya05/Grok-Build-GUI)
- Maintainer: **Sahil Rakhaiya**