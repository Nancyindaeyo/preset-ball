<script setup lang="ts">
defineProps<{ items: string[]; empty?: string }>();
const emit = defineEmits<{ remove: [name: string] }>();
</script>

<template>
  <div v-if="items.length" class="pb-tags">
    <span v-for="n in items" :key="n" class="pb-tag">
      <span class="pb-tag-txt">{{ n }}</span>
      <button type="button" class="pb-tag-x" :aria-label="`去掉 ${n}`" @click="emit('remove', n)">×</button>
    </span>
  </div>
  <p v-else class="pb-hint">{{ empty || '还没有条目。下面搜索后点进去。' }}</p>
</template>
