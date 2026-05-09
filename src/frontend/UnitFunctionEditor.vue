<script setup lang="ts">
import { ref, watch } from 'vue';
import { useFlexBridge } from '@flexsdk/runtime';

const { isReady, unitData, setUnitData } = useFlexBridge();
const message = ref('Hello from plugin!');

watch(unitData, (v) => {
  message.value = v?.message ?? 'Hello from plugin!';
}, { immediate: true });

async function save() {
  await setUnitData({ ...unitData.value, message: message.value });
}
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="pa-4">
        <v-text-field v-model="message" label="Message" variant="outlined" />
        <v-btn :disabled="!isReady" color="primary" @click="save">Save</v-btn>
      </v-container>
    </v-main>
  </v-app>
</template>
