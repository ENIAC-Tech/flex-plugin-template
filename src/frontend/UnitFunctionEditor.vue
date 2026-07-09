<script setup lang="ts">
import { ref, watch } from 'vue';
import { useFlexBridge, usePluginI18n } from '@flexsdk/runtime/vue';
import { pluginI18nMessages } from './i18n-messages';

const { isReady, unitData, setUnitData } = useFlexBridge();
const { t } = usePluginI18n({ messages: pluginI18nMessages, defaultLocale: 'en' });
const message = ref(t('message.default'));

watch(unitData, (v) => {
  message.value = v?.message ?? t('message.default');
}, { immediate: true });

async function save() {
  await setUnitData({ ...unitData.value, message: message.value });
}
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="pa-4">
        <v-text-field v-model="message" :label="t('unit.messageLabel')" variant="solo-filled" density="compact" />
        <v-btn :disabled="!isReady" color="primary" variant="tonal" prepend-icon="mdi-content-save" @click="save">
          {{ t('actions.save') }}
        </v-btn>
      </v-container>
    </v-main>
  </v-app>
</template>
