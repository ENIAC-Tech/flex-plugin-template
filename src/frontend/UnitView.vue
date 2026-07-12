<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue';
import { useFlexBridge } from '@flexsdk/runtime/vue';
import type { RendererStateEnvelope, RendererStateJson } from '@flexsdk/types';

const { isReady, bridge, typeId } = useFlexBridge();
const title = ref('');
const runtimeStatus = ref<Record<string, RendererStateJson> | null>(null);
let unsubscribeRuntime: (() => Promise<void>) | null = null;
let unsubscribeUnit: (() => void) | null = null;
let runtimeEpoch = -1;
let runtimeRevision = -1;

watch(isReady, async (ready) => {
  if (!ready || !bridge.value) return;
  unsubscribeUnit?.();
  unsubscribeUnit = bridge.value.onHostEvent('unit-updated', () => { void refresh(); });
  if (unsubscribeRuntime) await unsubscribeRuntime();
  unsubscribeRuntime = await bridge.value.subscribeRendererState(
    'runtime-status',
    (event: RendererStateEnvelope) => {
      // Reject stale envelopes before changing either the snapshot or cursors.
      if (event.providerEpoch < runtimeEpoch) return;
      if (event.providerEpoch === runtimeEpoch && event.revision <= runtimeRevision) return;

      const newEpoch = event.providerEpoch > runtimeEpoch;
      const contiguous = !newEpoch && event.revision === runtimeRevision + 1;
      if (newEpoch) runtimeStatus.value = null;

      if (event.kind === 'unavailable') runtimeStatus.value = null;
      else if (event.kind === 'available') { /* wait for a complete snapshot */ }
      else if (event.resyncRequired) runtimeStatus.value = null;
      else if (event.kind === 'snapshot') runtimeStatus.value = { ...event.payload };
      else if (event.kind === 'delta' && contiguous && runtimeStatus.value) {
        runtimeStatus.value = { ...runtimeStatus.value, ...event.payload };
      } else runtimeStatus.value = null; // gap/new epoch/missing snapshot: wait for replay/resync

      runtimeEpoch = event.providerEpoch;
      runtimeRevision = event.revision;
    },
    { replayLatest: true }
  );
  await refresh();
});

onUnmounted(() => {
  unsubscribeUnit?.();
  if (unsubscribeRuntime) void unsubscribeRuntime();
});

async function refresh() {
  if (!bridge.value) return;
  const u = await bridge.value.getUnit().catch(() => null);
  title.value = u?.name ?? typeId.value ?? '';
  await nextTick();
  bridge.value.notifyViewReady();
}
</script>

<template>
  <div class="pa-2 text-caption">{{ title }} · {{ runtimeStatus?.status ?? 'unavailable' }}</div>
</template>
