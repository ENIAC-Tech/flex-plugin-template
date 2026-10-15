import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { validatePluginDefinitionsPayload } from '@eniac/flexcli/src/utils/plugin-definitions-validator.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const imported = await import(pathToFileURL(resolve(root, 'dist/src/backend/index.js')));
const Plugin = imported.default?.default ?? imported.default;
const plugin = new Plugin(), feedback = [], errors = [];
const noop = async () => {};
const hostApi = {
  input: { feedback: async (...args) => feedback.push(args), setAvailability: noop },
  plugin: { callDependency: noop, registerRendererStateChannel: noop, publishRendererState: noop },
  unit: { on: noop }, bus: { on: noop }
};
const logger = { info() {}, debug() {}, warn() {}, error(...args) { errors.push(args); } };
const originalSend = process.send;
let sequence = 0, loaded = false;
const acknowledgements = new Map();
process.send = message => { acknowledgements.get(message.sequence)?.(); return true; };
async function deliver(method, serial, generation = 1, event) {
  const id = ++sequence;
  let timer;
  const ack = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Input ACK timed out')), 2000);
    acknowledgements.set(id, resolve);
  });
  plugin.onMessage({ type: 'plugin-event', envelope: { topic: 'input.function', sequence: id, payload: {
    functionId: 'timeline', method, event,
    context: { device: { serialNumber: serial, model: 'Flow2Pro' }, bindingId: 'shared-binding', generation,
      control: { id: 'encoder-1', kind: 'encoder' }, settings: { step: 2 } }
  } } });
  try { await ack; } finally { clearTimeout(timer); acknowledgements.delete(id); }
}
const rotate = delta => ({ type: 'rotate', delta, pressed: false, t: sequence });
try {
  await plugin.onLoad({ hostApi, logger, pluginUUID: '@your-username/your-plugin-name', pluginVersion: '1.0.0' });
  loaded = true;
  const functions = plugin.getFunctionDefinitions();
  assert.equal(functions.length, 1);
  assert.equal(functions[0].target, undefined);
  assert.deepEqual(validatePluginDefinitionsPayload({ ...await plugin.getDefinitions(), functions }), { ok: true, errors: [] });
  await deliver('activate', 'A'); await deliver('activate', 'B');
  await deliver('input', 'A', 1, rotate(5));
  await deliver('input', 'B', 1, rotate(2));
  assert.deepEqual(feedback.slice(-2).map(row => [row[0], row[3].value]), [['A', 10], ['B', 4]]);
  await deliver('input', 'A', 1, { type: 'cancel', t: sequence });
  await deliver('input', 'A', 1, rotate(1));
  assert.equal(feedback.at(-1)[3].value, 2);
  await deliver('deactivate', 'A'); await deliver('activate', 'A', 2);
  const before = feedback.length;
  await deliver('input', 'A', 1, rotate(50));
  assert.equal(feedback.length, before);
  await deliver('input', 'A', 2, rotate(100));
  assert.equal(feedback.at(-1)[3].value, 100);
  assert.deepEqual(errors, []);
  console.log('Built template definitions, typed settings, ACK, device isolation, cancel and generation tests passed.');
} finally {
  if (loaded) await plugin.onUnload();
  process.send = originalSend;
}
