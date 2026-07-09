<script setup lang="ts">
import { ref, watch } from 'vue';
import { useFlexBridge, usePluginI18n } from '@flexsdk/runtime/vue';
import { pluginI18nMessages } from './i18n-messages';

const { isReady, bridge } = useFlexBridge();
const { t } = usePluginI18n({ messages: pluginI18nMessages, defaultLocale: 'en' });
const unitName = ref('');

watch(isReady, async (ready) => {
  if (!ready || !bridge.value) return;
  const u = await bridge.value.getUnit().catch(() => null);
  if (u) unitName.value = u.name ?? '';
  bridge.value.onHostEvent('unit-updated', async () => {
    const next = await bridge.value!.getUnit().catch(() => null);
    if (next) unitName.value = next.name ?? '';
  });
});

async function save() {
  if (!bridge.value) return;
  const u = await bridge.value.getUnit().catch(() => null);
  if (!u) return;
  await bridge.value.setUnit({ ...u, name: unitName.value.trim() || u.name });
}
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="pa-4">
        <v-text-field v-model="unitName" :label="t('appearance.unitNameLabel')" variant="solo-filled" density="compact" />
        <v-btn :disabled="!isReady" color="primary" variant="tonal" prepend-icon="mdi-content-save" @click="save">
          {{ t('actions.saveAppearance') }}
        </v-btn>
      </v-container>
    </v-main>
  </v-app>
</template>
