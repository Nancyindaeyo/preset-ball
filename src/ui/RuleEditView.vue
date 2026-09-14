<script setup lang="ts">
import { promptRows, removeRule, resetRule, settings, upsertRule } from '@/state/store';
import { back, goHome } from '@/state/ui';
import type { PackSide, PromptRow, Rule, RuleKind } from '@/types';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import KindPick from '@/ui/KindPick.vue';
import TagList from '@/ui/TagList.vue';

const props = defineProps<{ id: string }>();
const src = computed(() => settings.rules.find(r => r.id === props.id));
const name = ref('');
const hint = ref('');
const kind = ref<RuleKind>('group');
const picked = ref<string[]>([]);
const onSide = reactive<PackSide>({ enable: [], disable: [] });
const offSide = reactive<PackSide>({ enable: [], disable: [] });
const q = ref('');
const rows = ref<PromptRow[]>([]);
const packTarget = ref<'onEnable' | 'onDisable' | 'offEnable' | 'offDisable'>('onEnable');

function loadFrom(r: Rule): void {
  name.value = r.name;
  hint.value = r.hint ?? '';
  picked.value = [...r.entries];
  onSide.enable = [...(r.on?.enable ?? [])];
  onSide.disable = [...(r.on?.disable ?? [])];
  offSide.enable = [...(r.off?.enable ?? [])];
  offSide.disable = [...(r.off?.disable ?? [])];
  kind.value = r.kind;
}

onMounted(async () => {
  rows.value = await promptRows();
  if (src.value) loadFrom(src.value);
});

watch(kind, (next, prev) => {
  if (prev === 'pack' && next !== 'pack' && !picked.value.length) {
    picked.value = [...onSide.enable];
  }
  if (prev !== 'pack' && next === 'pack' && !onSide.enable.length) {
    onSide.enable = [...picked.value];
  }
});

const filtered = computed(() => {
  const qq = q.value.trim();
  return rows.value.filter(r => !qq || r.name.includes(qq));
});

const currentPackList = computed(() => {
  const map = {
    onEnable: onSide.enable,
    onDisable: onSide.disable,
    offEnable: offSide.enable,
    offDisable: offSide.disable,
  } as const;
  return map[packTarget.value];
});

function toggleList(list: string[], item: string): void {
  const i = list.indexOf(item);
  if (i >= 0) list.splice(i, 1);
  else list.push(item);
}

function addToPack(item: string): void {
  toggleList(currentPackList.value, item);
}

function inCurrent(item: string): boolean {
  if (kind.value === 'pack') return currentPackList.value.includes(item);
  return picked.value.includes(item);
}

function save(): void {
  const r = src.value;
  if (!r) return;
  const next: Rule = {
    ...r,
    name: name.value.trim() || r.name,
    hint: hint.value.trim() || undefined,
    kind: kind.value,
    entries: kind.value === 'pack' ? [] : [...picked.value],
    on: kind.value === 'pack' ? { enable: [...onSide.enable], disable: [...onSide.disable] } : undefined,
    off: kind.value === 'pack' ? { enable: [...offSide.enable], disable: [...offSide.disable] } : undefined,
  };
  upsertRule(next);
  back();
}

function restore(): void {
  if (!src.value?.builtin) return;
  resetRule(src.value.id);
  const r = settings.rules.find(x => x.id === props.id);
  if (r) loadFrom(r);
}

const packTabs: Array<{ id: typeof packTarget.value; label: string }> = [
  { id: 'onEnable', label: '打开时打开' },
  { id: 'onDisable', label: '打开时关掉' },
  { id: 'offEnable', label: '关闭时打开' },
  { id: 'offDisable', label: '关闭时关掉' },
];
</script>

<template>
  <p v-if="!src" class="pb-empty">找不到这条规则。</p>
  <template v-else>
    <p class="pb-hint">{{ src.builtin ? '出厂规则，改完立刻生效。不对可以恢复。' : '这是你自己建的。' }}</p>
    <input v-model="name" class="pb-input" placeholder="名字" />
    <input v-model="hint" class="pb-input" placeholder="给自己看的说明（可空）" />

    <KindPick v-model="kind" />

    <template v-if="kind !== 'pack'">
      <p class="pb-hint">勾进这组的条目</p>
      <TagList :items="picked" empty="还没勾条目。" @remove="n => toggleList(picked, n)" />
      <input v-model="q" class="pb-search" placeholder="搜索条目" />
      <button
        v-for="row in filtered"
        :key="row.identifier"
        class="pb-row"
        :class="{ 'is-on': inCurrent(row.name) }"
        type="button"
        @click="toggleList(picked, row.name)"
      >
        <span class="ttl">{{ row.name }}</span>
      </button>
    </template>

    <template v-else>
      <p class="pb-hint">先点下面四份名单里要改的那一份，再点条目加进去或拿掉。</p>
      <div class="pb-seg">
        <button
          v-for="t in packTabs"
          :key="t.id"
          class="pb-seg-btn"
          :class="{ 'is-on': packTarget === t.id }"
          type="button"
          @click="packTarget = t.id"
        >
          {{ t.label }}
        </button>
      </div>

      <p class="pb-label">打开时要打开的</p>
      <TagList :items="onSide.enable" @remove="n => toggleList(onSide.enable, n)" />
      <p class="pb-label">打开时要关掉的</p>
      <TagList :items="onSide.disable" @remove="n => toggleList(onSide.disable, n)" />
      <p class="pb-label">关闭时要打开的（比如防止发情。不想要就点 × 拿掉）</p>
      <TagList :items="offSide.enable" @remove="n => toggleList(offSide.enable, n)" />
      <p class="pb-label">关闭时要关掉的</p>
      <TagList :items="offSide.disable" @remove="n => toggleList(offSide.disable, n)" />

      <input v-model="q" class="pb-search" placeholder="搜索后点条目，加入上面高亮的那一份" />
      <button
        v-for="row in filtered.slice(0, 80)"
        :key="row.identifier"
        class="pb-row"
        :class="{ 'is-on': inCurrent(row.name) }"
        type="button"
        @click="addToPack(row.name)"
      >
        <span class="ttl">{{ row.name }}</span>
      </button>
    </template>

    <div class="pb-actions">
      <button class="pb-btn primary" type="button" @click="save">保存规则</button>
      <button v-if="src.builtin" class="pb-btn" type="button" @click="restore">恢复出厂</button>
      <button v-else class="pb-btn danger" type="button" @click="removeRule(src.id); goHome()">删除</button>
    </div>
  </template>
</template>
