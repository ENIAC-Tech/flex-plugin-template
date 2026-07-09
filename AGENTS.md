# Agent Instructions

This is a FlexStudio plugin project.

When working on plugin development, use the bundled local skill:

`@.agents/skills/flexstudio-plugin-developer/SKILL.md`

Use the bundled FlexStudio plugin documentation snapshot under:

`.agents/skills/flexstudio-plugin-developer/references/flexdoc/`

Prefer the bundled docs for SDK, CLI, manifest, Host API, backend runtime, frontend bridge, Unit definitions, dependencies, and marketplace release workflow. If the bundled docs are missing or stale, confirm against the official FlexStudioDocumentation repository before changing plugin behavior.

For new plugin work:

- Keep `onLoad()` quick. Register definitions, RPC handlers, and event subscriptions early.
- Use `hostApi.jobs` for slow sync, scan, or import work instead of blocking startup.
- Only add `secrets`, `oauth`, or `jobs` permissions when the plugin really uses those namespaces.
- If the plugin accesses internet or LAN services, set `requiresNetwork: true`.
- Native or system automation business logic belongs in plugin code or native helpers; FlexStudio core only provides lifecycle, permissions, runtime APIs, and marketplace metadata.
- For plugin frontend work, follow `.agents/skills/flexstudio-plugin-developer/references/flexdoc/ui-ux-guidelines.md`: keep the UI consistent with FlexStudio, use Vuetify 3 components and matching variants, default to FlexStudio primary blue unless the plugin has a clear app accent, and avoid decorative prose or nested containers.
