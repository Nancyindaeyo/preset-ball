<script setup lang="ts">
import { isOn, mothra, promptRows, ruleForCurrentPreset, settings, toggleMutex, toggleName } from '@/state/store';
import { go } from '@/state/ui';
import type { PromptRow } from '@/types';
import { computed, onMounted, ref } from 'vue';
import EditBtn from '@/ui/EditBtn.vue';
import SecHead from '@/ui/SecHead.vue';

const q = ref('');
const rows = ref<PromptRow[]>([]);
const showSystem = ref(false);

onMounted(async () => {
  rows.value = await promptRows();
});

const present = computed(() => new Set(rows.value.map(r => r.name)));

const folders = computed(() => {
  const map = new Map<string, PromptRow[]>();
  const qq = q.value.trim();
  for (const row of rows.value) {
    if (!showSystem.value && (row.system || row.folder === '系统槽' || row.folder === '分隔')) continue;
    if (qq && !row.name.includes(qq)) continue;
    const list = map.get(row.folder) ?? [];
    list.push(row);
    map.set(row.folder, list);
  }
  return [...map.entries()];
});

const mutexes = computed(() =>
  settings.rules.filter(r => r.kind === 'mutex' && ruleForCurrentPreset(r) && r.entries.some(n => present.value.has(n))),
);
const groups = computed(() =>
  settings.rules.filter(
    r => r.kind === 'group' && r.section !== 'quick' && ruleForCurrentPreset(r) && r.entries.some(n => present.value.has(n)),
  ),
);

async function tap(row: PromptRow): Promise<void> {
  await toggleName(row.name, !isOn(row.name));
  rows.value = await promptRows();
}
</script>

<template>
  <p class="pb-hint">改的是预览，回主页点「保存方案」才写进酒馆和当前方案。标红的是接收器关着：上面条目开了也进不去。</p>
  <button v-if="!mothra" class="pb-btn" type="button" @click="go({ name: 'group-setup' })">重新分组</button>
  <input v-model="q" class="pb-search" placeholder="搜索" />
  <label class="pb-row">
    <span class="ttl">显示系统槽</span>
    <input v-model="showSystem" type="checkbox" />
  </label>

  <section v-for="m in mutexes" :key="m.id" class="pb-block">
    <SecHead :title="m.name">
      <EditBtn :label="`改 ${m.name}`" @click="go({ name: 'rule-edit', id: m.id, from: { name: 'fine' } })" />
    </SecHead>
    <p v-if="m.hint" class="pb-hint">{{ m.hint }}</p>
    <div class="pb-chips">
      <button
        v-for="n in m.entries.filter(x => present.has(x))"
        :key="n"
        class="pb-chip"
        :class="{ 'is-on': isOn(n) }"
        type="button"
        @click="toggleMutex(m, n)"
      >
        {{ n }}
      </button>
    </div>
  </section>

  <section v-for="g in groups" :key="g.id" class="pb-block">
    <SecHead :title="g.name">
      <EditBtn :label="`改 ${g.name}`" @click="go({ name: 'rule-edit', id: g.id, from: { name: 'fine' } })" />
    </SecHead>
    <button
      v-for="n in g.entries.filter(x => present.has(x))"
      :key="n"
      class="pb-row"
      :class="{ 'is-on': isOn(n) }"
      type="button"
      @click="toggleName(n, !isOn(n))"
    >
      <span class="ttl">{{ n }}</span>
      <span class="pb-switch" :class="{ 'is-on': isOn(n) }" />
    </button>
  </section>

  <details v-for="[folder, list] in folders" :key="folder" class="pb-folder">
    <summary>{{ folder }}</summary>
    <button
      v-for="row in list"
      :key="row.identifier"
      class="pb-row"
      :class="{ 'is-on': isOn(row.name), alert: row.receiver && !isOn(row.name) }"
      type="button"
      @click="tap(row)"
    >
      <span class="ttl">
        {{ row.name }}
        <small v-if="row.receiver">接收器：不开这个，同分区弹药进不去</small>
      </span>
      <span class="pb-switch" :class="{ 'is-on': isOn(row.name) }" />
    </button>
  </details>
</template>
