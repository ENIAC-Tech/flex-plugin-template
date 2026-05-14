# Source Map

Use this map when bundled docs are not enough or when exact implementation behavior matters.

## Current Plugin Project

- `manifest.json`: plugin identity, permissions, entries, devices, platforms, dependencies.
- `src/backend/index.ts`: backend runtime entry point.
- `src/frontend/*.vue`: Unit editors, Unit view, and config page.
- `src/frontend/main.ts`: `mountFlexPage` entry wiring.
- `.github/workflows/publish.yml`: release automation.

## FlexSDK2

- `packages/types/src/manifest.ts`: manifest types.
- `packages/types/src/plugin-definitions.ts`: Library and Unit definition types.
- `packages/types/src/plugin-api.ts`: Host API contracts.
- `packages/runtime/src/plugin-base.ts`: `FlexPluginBase`.
- `packages/runtime/src/frontend-bridge.ts`: iframe bridge internals.
- `packages/runtime/src/use-flex-bridge.ts`: Vue-facing bridge composable.
- `packages/runtime/src/mount-flex-page.ts`: frontend page mounting.
- `packages/runtime/src/plugin-definitions-validate.ts`: definition validation.

## FlexCLI

- `src/commands/v2/create.js`: template cloning and parameterization.
- `src/commands/v2/dev.js`: local dev mount, watch, reload, logs.
- `src/commands/v2/build.js`: build assembly.
- `src/commands/v2/pack.js`: `.flexplugin` packaging.
- `src/commands/v2/validate-plugin.js`: manifest and definitions validation.

## FlexStudio Host

- `src/main/plugin/plugin-manager.ts`: lifecycle orchestration.
- `src/main/plugin/process-host.ts`: backend process management.
- `src/main/plugin/api-broker.ts`: Host API dispatch.
- `src/main/plugin/capability-registry.ts`: permission and capability registry.
- `src/main/plugin/definition-registry.ts`: active definitions.
- `src/main/plugin/asset-protocol.ts`: `plugin-asset://` loading.
- `src/main/plugin/control-ws-server.ts`: CLI dev control WebSocket.
- `src/renderer/plugin/plugin-bridge.ts`: renderer to plugin iframe bridge.
- `src/renderer/plugin/plugin-unit-provider.ts`: active plugin Unit providers.

## Documentation Snapshot

- `.agents/skills/flexstudio-plugin-developer/references/flexdoc/metadata.json`: source commit and sync metadata.
- `.agents/skills/flexstudio-plugin-developer/references/docs-index.md`: generated index for bundled docs.
