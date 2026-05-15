# Fallback Quick Reference

Use this only when `references/flexdoc/` is missing or incomplete.

## Plugin Shape

- `manifest.json` declares identity, entries, permissions, platforms, devices, dependencies, and marketplace metadata.
- Backend entry is usually `src/backend/index.ts`; it exports a class extending `FlexPluginBase`.
- Frontend entries are iframe pages mounted through `mountFlexPage`.
- Frontend pages use `useFlexBridge` for Unit data, selected cycled function data, host context, snackbar, Host events, and backend RPC.

## Common Commands

```bash
flexcli plugin-v2 validate --plugin-dir .
flexcli plugin-v2 build --plugin-dir .
flexcli plugin-v2 dev .
flexcli plugin-v2 pack --dist-dir dist
```

## Common Contracts

- `unitFunctionEditor` is the Unit function/data editor iframe.
- `unitAppearanceEditor` is the Unit appearance editor iframe.
- `unitView` is the runtime iframe view for custom Unit UI.
- `configPage` is plugin-level configuration UI.
- Backend RPC methods must be registered by the backend before frontend calls `backendRpc`.
- Host API calls require matching `manifest.permissions`.
- Plugin Unit types are `standard`, `custom`, `canvas`, `cycled`, and `slider`.
- `cycled` reuses the host `cycled-key` architecture. Functions are fixed by the plugin definition; users cannot add/delete/reorder them, but can edit each function appearance through the host editor. Function `data` is edited through the bridge selected-function APIs.
- `slider` reuses the host volume slider architecture. The plugin definition supplies `format`, `min`, `max`, and optional `step`; there is no `decimals` field.
- `appearanceOverride` overlays the host default appearance. For `elements`, an override with `identifier` patches an existing element; an override without `identifier` appends a complete element.
- Runtime cycled state changes must use `hostApi.unit.setFunction(serialNumber, unitUuid, functionId)`.
- Runtime slider state changes must use `hostApi.unit.setSliderValue(serialNumber, unitUuid, value)`.
- Slider device changes are delivered through `unit.on(typeId, 'changed')` or `FlexPluginBase.onSliderUnitChanged()`.

Always prefer the full bundled docs when available.