<script setup lang="ts">
import { promptRows, saveFineLayout } from '@/state/store';
import { go } from '@/state/ui';
import type { FineFolder, PromptRow } from '@/types';
import { uid } from '@/version';
import { computed, onMounted, ref } from 'vue';

const rows = ref<PromptRow[]>([]);
const folders = ref<FineFolder[]>([]);
const selected = ref(0);
const newName = ref('');

onMounted(async () => {
  rows.value = await promptRows();
});

const assigned = computed(() => {
  const set = new Set<string>();
  for (const f of folders.value) for (const n of f.entries) set.add(n);
  return set;
});

const ungrouped = computed(() => rows.value.filter(r => !r.system && r.folder !== '分隔' && !assigned.value.has(r.name)));

function addFolder(): void {
  const name = newName.value.trim() || `分组 ${folders.value.length + 1}`;
  folders.value.push({ id: uid('fld'), name, entries: [] });
  selected.value = folders.value.length - 1;
  newName.value = '';
}

function dropFolder(i: number): void {
  folders.value.splice(i, 1);
  if (selected.value >= folders.value.length) selected.value = Math.max(0, folders.value.length - 1);
}

function put(name: string): void {
  const f = folders.value[selected.value];
  if (!f) return;
  if (f.entries.includes(name)) return;
  for (const other of folders.value) {
    other.entries = other.entries.filter(n => n !== name);
  }
  f.entries.push(name);
}

function take(name: string): void {
  for (const f of folders.value) f.entries = f.entries.filter(n => n !== name);
}

function done(): void {
  if (!folders.value.length) {
    window.alert('先至少建一个分组。');
    return;
  }
  saveFineLayout(folders.value);
  go({ name: 'fine' });
}
</script>

<template>
  <p class="pb-hint">当前不是蛾摩拉预设。先把条目分进自己的组，以后点细调就按这些组来。没分的会进「未分组」。</p>
  <div class="pb-actions">
    <input v-model="newName" class="pb-input" placeholder="分组名，比如：人设" style="margin-bottom: 0; flex: 1; min-width: 0" />
    <button class="pb-btn primary" type="button" @click="addFolder">加分组</button>
  </div>
  <div v-for="(f, i) in folders" :key="f.id" class="pb-card" :class="{ 'is-on': selected === i }">
    <button class="pb-card-hit" type="button" @click="selected = i">
      <span class="ttl">{{ f.name }}<small>{{ f.entries.length }} 条</small></span>
    </button>
    <div class="pb-card-ops">
      <button class="pb-btn danger" type="button" @click="dropFolder(i)">删</button>
    </div>
  </div>
  <p v-if="folders.length" class="pb-label">点下面条目放进「{{ folders[selected]?.name }}」</p>
  <p v-else class="pb-hint">先加一个分组，再点条目放进去。</p>
  <button
    v-for="n in folders[selected]?.entries ?? []"
    :key="'in-' + n"
    class="pb-row is-on"
    type="button"
    @click="take(n)"
  >
    <span class="ttl">{{ n }}<small>点一下拿出来</small></span>
  </button>
  <p class="pb-label">未分组（{{ ungrouped.length }}）</p>
  <button v-for="row in ungrouped" :key="row.identifier" class="pb-row" type="button" @click="put(row.name)">
    <span class="ttl">{{ row.name }}</span>
  </button>
  <div class="pb-foot">
    <button class="pb-btn primary" type="button" @click="done">完成，去细调</button>
  </div>
</template>
