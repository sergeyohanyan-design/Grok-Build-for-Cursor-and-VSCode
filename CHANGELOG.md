# Changelog

## 1.0.5 — 2026-08-16

> Enhanced fork ([sergeyohanyan-design/Grok-Build-GUI](https://github.com/sergeyohanyan-design/Grok-Build-GUI)) of upstream 1.0.4. Marketplace builds still stub voice; this tag is the full local build.

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