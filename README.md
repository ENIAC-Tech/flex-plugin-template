# Your Plugin Name

A short description of your plugin.

## Agent Skill

This template includes a local Codex/OpenAI-compatible skill for FlexStudio plugin development:

`@.agents/skills/flexstudio-plugin-developer/SKILL.md`

Use that skill when asking an agent to edit plugin code, manifest fields, Unit definitions, backend runtime behavior, frontend iframe pages, Host API usage, dependency APIs, CLI workflows, or marketplace release setup. The skill routes the agent to the bundled FlexStudio plugin docs snapshot under `.agents/skills/flexstudio-plugin-developer/references/flexdoc/`.

Frontend plugin pages should follow the bundled UI/UX guideline at `.agents/skills/flexstudio-plugin-developer/references/flexdoc/ui-ux-guidelines.md`: use Vuetify 3 components, compact density, `solo-filled` fields, `tonal` buttons, FlexStudio theme tokens, and avoid decorative copy or nested containers.

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

If your plugin talks to internet or LAN services, also set `requiresNetwork: true`. The marketplace network badge is based on this metadata field; `http` and `websocket` permissions still control the actual Host API access.

## Manifest Fields

| Field | Description |
|---|---|
| `uuid` | Marketplace identity, usually `@username/plugin-name`. |
| `minHostVersion` | Minimum FlexStudio version required by the plugin. |
| `native` | Whether the plugin uses native Node.js addons. |
| `platforms` | Supported OS and architecture combinations. |
| `requiresNetwork` | Whether the plugin accesses internet or local network services. Set `true` for networked plugins. |
| `runtime` | Optional backend runtime metadata such as `startupTimeoutMs`. Keep `onLoad()` fast and use jobs for slow sync. |
| `devices` | Target device models. |
| `requiredCapabilities` | Device capabilities required at runtime. |
| `permissions` | Host API permissions. Sensitive permissions may require review. |
| `dependencies` | Other marketplace plugins this plugin depends on. |

## Optional Sensitive Permissions

The template does not request `secrets`, `oauth`, or `jobs` by default. Add them only when your plugin actually uses those Host API namespaces.

- `secrets`: store API keys, access tokens, and refresh tokens. FlexStudio normally encrypts them with Electron `safeStorage`; if encryption is unavailable or write-time encryption fails, the host stores plugin-scoped plaintext and shows a short warning. If a real encrypted record later fails to decrypt, `get()` returns no value, so your plugin should ask the user to re-save the secret.
- `oauth`: start a host-managed loopback authorization flow with `state` validation. Token exchange and token storage remain your responsibility; store tokens through `hostApi.secrets`.
- `jobs`: create host-owned in-memory progress records for long sync/import/index tasks. Cancellation is cooperative: the host requests cancel, your plugin polls `isCancellationRequested(jobId)`, performs cleanup, then calls `jobs.cancel(jobId)`.

## Startup Guidance

Keep `onLoad()` short. Register RPC handlers, dependency APIs, event subscriptions, and definitions early so the plugin becomes available quickly. Move slow provider sync, remote indexing, and bulk scanning into background jobs instead of blocking startup.

## Dependency State Channel

Use the Dependency State Channel when a plugin needs to publish retained state to a declared direct dependency. A Provider registers a channel and publishes JSON snapshots or deltas; a Consumer declares both `pluginApi` and the Provider in `dependencies`, then subscribes with `onDependencyState()`. The channel is not a global bus and does not add manifest fields or permissions for Providers.

```ts
// Provider: await this.registerDependencyStateChannel('playback')
// Consumer: await this.onDependencyState('@acme/provider', 'playback', onState, { replayLatest: true })
```

Treat `resyncRequired` as a full local-cache replacement, and discard local state when `providerEpoch` increases. See the bundled `dependency-api.md` before adding this capability.

## Choosing a State or Call API

Use the narrowest transport that matches the lifetime and audience of the data:

- Ongoing state owned by another declared plugin dependency: **Dependency State Channel**.
- Ongoing state shared by this plugin's backend and its own UI: **Renderer State Channel** with retained replay and mount/unmount cleanup.
- One-shot commands or queries: a dependency API for another plugin, or **backend RPC** for this plugin's UI.
- Never use intervals, long-polling, or a global bus to move retained state. Do not repeatedly read the same state through backend RPC.

The `runtime-status` example in `src/backend/index.ts` publishes an initial snapshot and a later delta. `src/frontend/UnitView.vue` subscribes with `{ replayLatest: true }` and unsubscribes when Vue unmounts.

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
