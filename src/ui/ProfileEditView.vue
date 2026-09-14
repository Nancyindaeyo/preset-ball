<script setup lang="ts">
import {
  commitProfileDraft,
  persistSettings,
  promptRows,
  removeProfile,
  settings,
} from '@/state/store';
import { goHome } from '@/state/ui';
import type { PromptRow } from '@/types';
import { computed, onMounted, ref } from 'vue';

const props = defineProps<{ id: string }>();
const profile = computed(() => settings.profiles.find(p => p.id === props.id));
const name = ref('');
const q = ref('');
const rows = ref<PromptRow[]>([]);
const draft = ref<Record<string, boolean>>({});
const showSystem = ref(false);
const loreSync = ref(false);
const loreWorlds = ref<string[]>([]);

onMounted(async () => {
  const p = profile.value;
  if (!p) return;
  name.value = p.name;
  loreSync.value = Boolean(p.loreSync);
  loreWorlds.value = [...(p.loreWorlds ?? [])];
  rows.value = await promptRows();
  const next: Record<string, boolean> = {};
  for (const row of rows.value) next[row.name] = row.enabled;
  if (p.kind === 'full' && p.entries) Object.assign(next, p.entries);
  else {
    for (const n of p.enable ?? []) next[n] = true;
    for (const n of p.disable ?? []) next[n] = false;
  }
  draft.value = next;
});

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

function on(name: string): boolean {
  return draft.value[name] !== false;
}

function setOn(row: PromptRow, enabled: boolean): void {
  draft.value = { ...draft.value, [row.name]: enabled };
}

async function save(applyNow: boolean): Promise<void> {
  const p = profile.value;
  if (!p) return;
  p.loreSync = loreSync.value;
  p.loreWorlds = [...loreWorlds.value];
  persistSettings();
  await commitProfileDraft(p, name.value, draft.value, applyNow);
  goHome();
}

function onDelete(): void {
  const p = profile.value;
  if (!p) return;
  const extra = p.builtin ? '出厂方案删了以后，可在扩展设置里点「补回出厂方案」。' : '';
  if (!window.confirm(`删除方案「${p.name}」？${extra}`)) return;
  removeProfile(p.id);
  goHome();
}
</script>

<template>
  <p v-if="!profile" class="pb-empty">找不到这个方案。</p>
  <template v-else>
    <p class="pb-hint">这里改的是方案草稿。点保存之前不会动酒馆。系统槽默认收着。</p>
    <input v-model="name" class="pb-input" placeholder="方案名字" />
    <label class="pb-row">
      <span class="ttl">
        套用时同步世界书
        <small>默认关。打开后会按下面勾的全局书去挂（有时要有时不要）。</small>
      </span>
      <input v-model="loreSync" type="checkbox" />
    </label>
    <template v-if="loreSync">
      <button
        v-for="s in settings.loreShortcuts"
        :key="s.id"
        class="pb-row"
        :class="{ 'is-on': loreWorlds.includes(s.worldName) }"
        type="button"
        @click="
          loreWorlds.includes(s.worldName)
            ? (loreWorlds = loreWorlds.filter(w => w !== s.worldName))
            : loreWorlds.push(s.worldName)
        "
      >
        <span class="ttl">{{ s.name }}</span>
        <span class="pb-switch" :class="{ 'is-on': loreWorlds.includes(s.worldName) }" />
      </button>
      <p v-if="!settings.loreShortcuts.length" class="pb-hint">先在主页把世界书加入快捷。</p>
    </template>
    <input v-model="q" class="pb-search" placeholder="搜索条目名" />
    <label class="pb-row">
      <span class="ttl">显示系统槽 / 分隔线</span>
      <input v-model="showSystem" type="checkbox" />
    </label>
    <details v-for="[folder, list] in folders" :key="folder" class="pb-folder">
      <summary>{{ folder }}（{{ list.length }}）</summary>
      <button
        v-for="row in list"
        :key="row.identifier"
        class="pb-row"
        :class="{ 'is-on': on(row.name), alert: row.receiver && !on(row.name) }"
        type="button"
        @click="setOn(row, !on(row.name))"
      >
        <span class="ttl">
          {{ row.name }}
          <small v-if="row.receiver">接收器：不开这个，上面开了也进不去</small>
        </span>
        <span class="pb-switch" :class="{ 'is-on': on(row.name) }" />
      </button>
    </details>
    <div class="pb-foot">
      <div class="pb-actions">
        <button class="pb-btn" type="button" @click="save(false)">只保存</button>
        <button class="pb-btn primary" type="button" @click="save(true)">保存并套用</button>
      </div>
      <button class="pb-btn danger pb-delete" type="button" @click="onDelete">删除这个方案</button>
    </div>
  </template>
</template>
