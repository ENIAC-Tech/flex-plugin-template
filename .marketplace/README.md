# Marketplace README files (plugin authors)

FlexDesigner loads plugin documentation from your GitHub repository using the **same language codes as the host app** (FlexStudio / FlexDesigner renderer i18next keys in `src/renderer/main.ts`). Use these codes exactly in filenames so the server and client need no mapping.

## Add per-locale storefront READMEs

Create Markdown files under `.marketplace/`:

| Filename | Host UI language |
|----------|------------------|
| `README.en.md` | English (`en`) |
| `README.zh-CN.md` | Chinese (`zh-CN`) |
| `README.de.md` | German (`de`) |
| `README.fr.md` | French (`fr`) |
| `README.ja.md` | Japanese (`ja`) |

Example: for Simplified Chinese, the path is `.marketplace/README.zh-CN.md` (not `README.zh.md`).

## Fallback

If no `README.<language>.md` exists for the user’s current UI language, the marketplace falls back to the **repository root** `README.md` on the branch or tag being read.

## About this file

This `.marketplace/README.md` is **documentation for authors only**. It is not shown as the public listing description on the marketplace.
