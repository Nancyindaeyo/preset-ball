<script setup lang="ts">
import Orb from '@/ui/Orb.vue';
import Sheet from '@/ui/Sheet.vue';
import { watchTheme } from '@/host/theme';
import { onMounted, onUnmounted, ref } from 'vue';

const root = ref<HTMLElement | null>(null);
let stop: (() => void) | undefined;
onMounted(() => {
  if (root.value) stop = watchTheme(root.value);
});
onUnmounted(() => stop?.());
</script>

<template>
  <div ref="root" class="pb-root">
    <Orb />
    <Sheet />
  </div>
</template>
