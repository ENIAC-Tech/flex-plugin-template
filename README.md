# Your Plugin Name

A short description of your plugin.

## Agent Skill

This template includes a local Codex/OpenAI-compatible skill for FlexStudio plugin development:

`@.agents/skills/flexstudio-plugin-developer/SKILL.md`

Use that skill when asking an agent to edit plugin code, manifest fields, Unit definitions, backend runtime behavior, frontend iframe pages, Host API usage, dependency APIs, CLI workflows, or marketplace release setup. The skill routes the agent to the bundled FlexStudio plugin docs snapshot under `.agents/skills/flexstudio-plugin-developer/references/flexdoc/`.

## Development

```bash
npm install
npm run dev
```

`npm run dev` starts the FlexCLI v2 dev workflow and connects the plugin to FlexStudio. Changes to backend and frontend code are rebuilt and reloaded by FlexCLI.

## Building

```bash
npm run build
```

Compiles TypeScript and bundles frontend pages into `dist/`.

## Publishing to the Marketplace

Releases are automated via GitHub Actions.

### First-time setup

1. Register your plugin in FlexStudio Marketplace.
2. Copy the generated webhook secret.
3. Add it to your GitHub repo as the `FLEX_MARKETPLACE_WEBHOOK_SECRET` Actions secret.

### Releasing a new version

1. Push your changes to `main`.
2. Update `package.json` `version`.
3. Create a new GitHub Release with a matching semver tag, such as `v1.0.0`.
4. The workflow verifies that the tag matches `package.json`, then builds, packs, and notifies the marketplace server.
5. If permissions or platform support changed, the release may enter the review queue.

### Native plugins

If your plugin requires native Node.js addons, set `native: true` in `manifest.json`. The release workflow should build one package for each declared platform.

## Manifest Fields

| Field | Description |
|---|---|
| `uuid` | Marketplace identity, usually `@username/plugin-name`. |
| `minHostVersion` | Minimum FlexStudio version required by the plugin. |
| `native` | Whether the plugin uses native Node.js addons. |
| `platforms` | Supported OS and architecture combinations. |
| `devices` | Target device models. |
| `requiredCapabilities` | Device capabilities required at runtime. |
| `permissions` | Host API permissions. Sensitive permissions may require review. |
| `dependencies` | Other marketplace plugins this plugin depends on. |

## Project Structure

```text
.agents/                         # Local agent skill and bundled plugin docs snapshot
.flexstudio/plugin-docs.json      # Sync metadata for the bundled docs snapshot
.github/workflows/publish.yml     # Automated release workflow
.marketplace/                     # Optional localized marketplace listing READMEs
src/backend/index.ts              # Plugin backend entry point
src/frontend/                     # UI pages, Vue 3, Vuetify 3
locales/en.json                   # i18n strings
manifest.json                     # Plugin manifest
package.json                      # Plugin package metadata and local version source
tsconfig.json
vite.config.ts
```
