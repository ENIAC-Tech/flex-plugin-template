<script setup lang="ts">
import { ref, watch } from 'vue';
import { useFlexBridge, usePluginI18n } from '@flexsdk/runtime/vue';
import { pluginI18nMessages } from './i18n-messages';

const { isReady, backendRpc } = useFlexBridge();
const { t } = usePluginI18n({ messages: pluginI18nMessages, defaultLocale: 'en' });
const message = ref(t('message.default'));

watch(isReady, async (ready) => {
  if (!ready) return;
  message.value = await backendRpc('getMessage');
}, { immediate: true });

async function save() {
  await backendRpc('setMessage', [message.value]);
}
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="pa-4">
        <v-text-field v-model="message" :label="t('config.defaultMessageLabel')" variant="solo-filled" density="compact" />
        <v-btn :disabled="!isReady" color="primary" variant="tonal" prepend-icon="mdi-content-save" @click="save">
          {{ t('actions.saveSettings') }}
        </v-btn>
      </v-container>
    </v-main>
  </v-app>
</template>
