<script setup lang="ts">
import { addLoreShortcut, listWorldNames } from '@/state/store';
import { goHome } from '@/state/ui';
import { onMounted, ref } from 'vue';

const names = ref<string[]>([]);
const q = ref('');

onMounted(async () => {
  names.value = await listWorldNames();
});

const shown = () => {
  const qq = q.value.trim();
  return names.value.filter(n => !qq || n.includes(qq));
};

async function pick(worldName: string): Promise<void> {
  await addLoreShortcut(worldName);
  goHome();
}
</script>

<template>
  <p v-if="!names.length" class="pb-empty">当前读不到世界书列表。确认酒馆已经加载世界书。</p>
  <template v-else>
    <input v-model="q" class="pb-search" placeholder="搜索世界书" />
    <button v-for="n in shown()" :key="n" class="pb-row" type="button" @click="pick(n)">
      <span class="ttl">{{ n }}</span>
    </button>
  </template>
</template>
