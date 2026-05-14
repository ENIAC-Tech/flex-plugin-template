# Fallback Quick Reference

Use this only when `references/flexdoc/` is missing or incomplete.

## Plugin Shape

- `manifest.json` declares identity, entries, permissions, platforms, devices, dependencies, and marketplace metadata.
- Backend entry is usually `src/backend/index.ts`; it exports a class extending `FlexPluginBase`.
- Frontend entries are iframe pages mounted through `mountFlexPage`.
- Frontend pages use `useFlexBridge` for Unit data, host context, snackbar, Host events, and backend RPC.

## Common Commands

```bash
flexcli plugin-v2 validate --plugin-dir .
flexcli plugin-v2 build --plugin-dir .
flexcli plugin-v2 dev .
flexcli plugin-v2 pack --dist-dir dist
```

## Common Contracts

- `unitFunctionEditor` means Unit 功能编辑器页面.
- `unitAppearanceEditor` means Unit 外观编辑器页面.
- `unitView` is the runtime iframe view for custom Unit UI.
- `configPage` is plugin-level configuration UI.
- Backend RPC methods must be registered by the backend before frontend calls `backendRpc`.
- Host API calls require matching `manifest.permissions`.

Always prefer the full bundled docs when available.
