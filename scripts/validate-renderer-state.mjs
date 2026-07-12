import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const backend = await readFile(new URL('../src/backend/index.ts', import.meta.url), 'utf8');
const view = await readFile(new URL('../src/frontend/UnitView.vue', import.meta.url), 'utf8');
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
const agents = await readFile(new URL('../AGENTS.md', import.meta.url), 'utf8');
const taskRouter = await readFile(new URL('../.agents/skills/flexstudio-plugin-developer/references/task-router.md', import.meta.url), 'utf8');
const sourceMap = await readFile(new URL('../.agents/skills/flexstudio-plugin-developer/references/source-map.md', import.meta.url), 'utf8');

for (const source of [backend, view]) assert.match(source, /runtime-status/);
assert.match(backend, /registerRendererStateChannel/);
assert.match(backend, /publishRendererState/);
assert.match(view, /subscribeRendererState/);
assert.match(view, /replayLatest:\s*true/);
assert.match(view, /onUnmounted/);
assert.doesNotMatch(view, /setInterval|setTimeout/);
for (const source of [readme, agents]) {
  assert.match(source, /Dependency State Channel/);
  assert.match(source, /Renderer State Channel/);
  assert.match(source, /backend RPC/);
  assert.match(source, /interval/i);
  assert.match(source, /long-polling/i);
  assert.match(source, /global bus/i);
}
assert.match(taskRouter, /Renderer State Channel.*frontend-bridge\.md.*backend-runtime\.md.*host-api-reference\.md.*dependency-api\.md/);
assert.match(sourceMap, /renderer-state-registry/);

console.log('Template renderer state guidance contract passed.');
