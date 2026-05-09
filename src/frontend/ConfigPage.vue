<script setup lang="ts">
import { ref, watch } from 'vue';
import { useFlexBridge } from '@flexsdk/runtime';

const { isReady, backendRpc } = useFlexBridge();
const message = ref('Hello from plugin!');

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
        <v-text-field v-model="message" label="Default Message" variant="outlined" />
        <v-btn :disabled="!isReady" color="primary" @click="save">Save Settings</v-btn>
      </v-container>
    </v-main>
  </v-app>
</template>
