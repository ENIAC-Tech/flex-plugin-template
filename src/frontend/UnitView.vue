<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useFlexBridge } from '@flexsdk/runtime';

const { isReady, bridge, typeId } = useFlexBridge();
const title = ref('');

watch(isReady, async (ready) => {
  if (!ready || !bridge.value) return;
  bridge.value.onHostEvent('unit-updated', () => { void refresh(); });
  await refresh();
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
  <div class="pa-2 text-caption">{{ title }}</div>
</template>
