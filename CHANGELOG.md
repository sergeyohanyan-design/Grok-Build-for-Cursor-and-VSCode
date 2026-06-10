# Changelog

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