<script setup lang="ts">
import type { RuleKind } from '@/types';

const kind = defineModel<RuleKind>({ required: true });

const options: Array<{ id: RuleKind; title: string; hint: string }> = [
  { id: 'group', title: '一组开关', hint: '里面每条自己开自己关，像人设三条。' },
  { id: 'mutex', title: '只能开一个', hint: '开新的会自动关掉同组其他条。适合文风、基调。' },
  { id: 'pack', title: '点一下开一组', hint: '指定打开时开哪些、关哪些。适合 NSFW、伦理包。' },
];
</script>

<template>
  <p class="pb-hint">这组按钮怎么用</p>
  <div class="pb-choice">
    <button
      v-for="o in options"
      :key="o.id"
      class="pb-row"
      :class="{ 'is-on': kind === o.id }"
      type="button"
      @click="kind = o.id"
    >
      <span class="ttl">{{ o.title }}<small>{{ o.hint }}</small></span>
    </button>
  </div>
</template>
