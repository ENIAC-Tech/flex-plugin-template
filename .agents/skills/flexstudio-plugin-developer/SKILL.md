---
name: flexstudio-plugin-developer
description: "Develop or debug FlexStudio v2 plugins: native Units, device input functions, binding settings, state channels and SDK/host integration, using the bundled architecture and API documentation."
---

# FlexStudio Plugin Developer

Use this skill for FlexStudio v2 plugin work. Keep context focused: load only the references that match the current task.

## Required First Step

Use `references/task-router.md` when choosing documentation for an unfamiliar task. Read only the references relevant to the changed contract.

## Source Of Truth

The bundled docs live in `references/flexdoc/` and are synced from FlexStudioDocumentation. Prefer those docs over memory.

If the task needs source-code confirmation, read `references/source-map.md` to locate the relevant SDK, CLI, host, and template files.

## Operating Rules

- Do not guess manifest fields, Host API names, CLI flags, bridge methods, or Unit definition shapes. Load the relevant reference first.
- Treat `manifest.json`, backend runtime, frontend bridge pages, Unit definitions, UI/UX guidelines, and release workflow as one system. Check cross-file contracts when changing any of them.
- Input functions are separate from Unit definitions: use `defineFunction` and `FlexPluginBase.functions`. Read `references/flexdoc/input-functions.md` for physical input, function settings, feedback or availability work. Do not invent raw device subscriptions or fake Units for functions that need no screen target.
- Keep input state and tool instances isolated by device serial number and binding ID. Use SDK lifecycle/tools for cancellation, serial delivery and stale feedback; no acceleration or long-press repeat is currently supported.
- Use declarative fields for ordinary binding settings. Complex pages use the `input-function-settings` bridge and its session ID, not Unit data, plugin-wide configuration or a raw JSON editor for end users.
- Choose the owner before adding state: Dependency State Channel for a declared dependency, Renderer State Channel for same-plugin UI, input context for binding feedback. Use RPC for one-shot actions. Native panel/chart/label Units use their documented host APIs rather than parallel image or bus protocols.
- When designing plugin UI, load `references/flexdoc/ui-ux-guidelines.md` and follow FlexStudio's Vuetify 3 component, variant, density, color, and layout conventions.
- Choose validation for the affected contract: validate manifest/schema changes, build changed executable code, and pack when packaging, assets or release behavior is involved.
- Keep generated plugin projects compatible with the template structure unless the user explicitly asks for a custom structure.
- When docs and local code disagree, prefer the local package/API version in the plugin project, then note the mismatch.

- For a released plugin's Unit schema, check `migrateUnit()` and its contract. A user-authorized development hard cut does not require migration or compatibility code. Do not apply Unit migration hooks to input binding settings.
## Reference Map

- Task routing: `references/task-router.md`
- Source locations: `references/source-map.md`
- Bundled docs index: `references/docs-index.md`
- Emergency summary: `references/fallback-quick-reference.md`
- Full synced docs: `references/flexdoc/*.md`
