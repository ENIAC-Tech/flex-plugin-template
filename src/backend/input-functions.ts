import { defineFunction } from '@flexsdk/runtime';
import { input } from '@flexsdk/runtime/input';

/** A unit-free example; SDK tools isolate state by device and binding. */
export function createInputFunctions() {
  const position = input.absolute<{ step: number }>(
    ({ value }, ctx) => ctx.feedback({ text: String(value), value: value / 100 }), // feedback value is normalized to [0, 1]
    { min: 0, max: 100, initial: 0 }
  );
  return {
    timeline: defineFunction({
      name: 'Timeline',
      icon: 'mdi-timeline',
      inputs: { rotate: 'required' },
      settings: {
        step: { type: 'number', label: 'Step', default: 1, min: 1, max: 10, step: 1 }
      },
      onActivate(ctx) {
        position.setValue(ctx, 0);
        ctx.feedback({ text: '0', value: 0 });
      },
      onInput(event, ctx) {
        return position(event.type === 'rotate'
          ? { ...event, delta: event.delta * ctx.settings.step }
          : event, ctx);
      }
    })
  };
}
