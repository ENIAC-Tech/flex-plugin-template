# Agent Instructions

This is a FlexStudio plugin project.

When working on plugin development, use the bundled local skill:

`@.agents/skills/flexstudio-plugin-developer/SKILL.md`

Use the bundled FlexStudio plugin documentation snapshot under:

`.agents/skills/flexstudio-plugin-developer/references/flexdoc/`

Prefer the bundled docs for SDK, CLI, manifest, Host API, backend runtime, frontend bridge, Unit definitions, dependencies, and marketplace release workflow. If the bundled docs are missing or stale, confirm against the official FlexStudioDocumentation repository before changing plugin behavior.

Before designing or rebuilding a product plugin that connects to an external service, also read `.agents/skills/flexstudio-plugin-developer/references/flexdoc/product-plugin-design-guide.md`. It defines the default single-plugin boundary, real Catalog selectors, single-task Units, confirmed state synchronization, connection/settings behavior, and review anti-patterns.

For new plugin work:

- Keep `onLoad()` quick. Register definitions, RPC handlers, and event subscriptions early.
- Use `hostApi.jobs` for slow sync, scan, or import work instead of blocking startup.
- Only add `secrets`, `oauth`, or `jobs` permissions when the plugin really uses those namespaces.
- If the plugin accesses internet or LAN services, set `requiresNetwork: true`.
- Native or system automation business logic belongs in plugin code or native helpers; FlexStudio core only provides lifecycle, permissions, runtime APIs, and marketplace metadata.
- Choose **Dependency State Channel** for ongoing dependency state and **Renderer State Channel** for ongoing same-plugin UI state. Use a dependency API or backend RPC only for one-shot commands/queries. Never use intervals, long-polling, or a global bus for retained state.
- For plugin frontend work, follow `.agents/skills/flexstudio-plugin-developer/references/flexdoc/ui-ux-guidelines.md`: keep the UI consistent with FlexStudio, use Vuetify 3 components and matching variants, default to FlexStudio primary blue unless the plugin has a clear app accent, and avoid decorative prose or nested containers.
