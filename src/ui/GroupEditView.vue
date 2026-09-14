<script setup lang="ts">
import { HOME_SECTIONS } from '@/catalog/groups';
import { persistSettings, settings } from '@/state/store';
import { go } from '@/state/ui';
import type { Rule } from '@/types';
import { computed } from 'vue';

const props = defineProps<{ group: string }>();
const spec = computed(() => HOME_SECTIONS[props.group]);
const members = computed(() => {
  const ids = spec.value?.ruleIds ?? [];
  return ids.map(id => settings.rules.find(r => r.id === id)).filter((r): r is Rule => Boolean(r));
});

const exclusive = computed({
  get() {
    const key = spec.value?.exclusiveKey;
    if (!key) return false;
    return settings.exclusiveGroups?.[key] === true;
  },
  set(on: boolean) {
    const key = spec.value?.exclusiveKey;
    if (!key) return;
    if (!settings.exclusiveGroups) settings.exclusiveGroups = {};
    if (on) settings.exclusiveGroups[key] = true;
    else delete settings.exclusiveGroups[key];
    persistSettings();
  },
});

function kindLabel(r: Rule): string {
  if (r.kind === 'mutex') return '只能开一个';
  if (r.kind === 'pack') return '点一下开一组';
  return '一组开关';
}

function openRule(id: string): void {
  go({ name: 'rule-edit', id, from: { name: 'group-edit', group: props.group } });
}
</script>

<template>
  <p v-if="!spec" class="pb-empty">找不到这一组。</p>
  <template v-else>
    <p class="pb-hint">默认可以叠。冲突会在主页标红。只有你想点一个就关其他时，才打开「只能选一个」。</p>

    <button
      v-if="spec.exclusiveKey"
      class="pb-row"
      :class="{ 'is-on': exclusive }"
      type="button"
      @click="exclusive = !exclusive"
    >
      <span class="ttl">
        只能选一个
        <small>打开后，点一个会把同组其他项关掉。默认关着，让你自己叠。</small>
      </span>
      <span class="pb-switch" :class="{ 'is-on': exclusive }" />
    </button>

    <button
      v-for="r in members"
      :key="r.id"
      class="pb-card"
      type="button"
      @click="openRule(r.id)"
    >
      <span class="pb-card-hit">
        <span class="ttl">
          {{ r.name.replace(/^伦理：/, '').replace(/^骨架：/, '') }}
          <small>{{ kindLabel(r) }}{{ r.hint ? ` · ${r.hint}` : '' }}</small>
        </span>
      </span>
      <span class="pb-card-ops">
        <span class="pb-btn">改</span>
      </span>
    </button>
  </template>
</template>
