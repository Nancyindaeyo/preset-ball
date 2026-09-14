<script setup lang="ts">
import type { RuleKind } from '@/types';

const kind = defineModel<RuleKind>({ required: true });

const options: Array<{ id: RuleKind; title: string; hint: string }> = [
  { id: 'group', title: '每条自己开关', hint: '像一组独立开关。想开哪条开哪条。' },
  { id: 'mutex', title: '只能开一条', hint: '开新的会关掉同组其他条。适合文风、人称。' },
  { id: 'pack', title: '点一下开一组', hint: '指定打开哪些、关掉哪些。适合一键 NSFW。' },
  { id: 'ladder', title: '档位，一次加一层', hint: '像破限：选 2 会带上 1。数字越大叠得越多。' },
];
</script>

<template>
  <p class="pb-hint">这个按钮怎么用？</p>
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
