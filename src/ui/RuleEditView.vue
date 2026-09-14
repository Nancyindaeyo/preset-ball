<script setup lang="ts">
import { promptRows, removeRule, resetRule, settings, upsertRule } from '@/state/store';
import { goHome } from '@/state/ui';
import type { PackSide, PromptRow, Rule } from '@/types';
import { computed, onMounted, reactive, ref } from 'vue';

const props = defineProps<{ id: string }>();
const src = computed(() => settings.rules.find(r => r.id === props.id));
const name = ref('');
const hint = ref('');
const kind = ref<Rule['kind']>('group');
const picked = ref<string[]>([]);
const onSide = reactive<PackSide>({ enable: [], disable: [] });
const offSide = reactive<PackSide>({ enable: [], disable: [] });
const q = ref('');
const rows = ref<PromptRow[]>([]);
const packTarget = ref<'onEnable' | 'onDisable' | 'offEnable' | 'offDisable'>('onEnable');

onMounted(async () => {
  rows.value = await promptRows();
  const r = src.value;
  if (!r) return;
  name.value = r.name;
  hint.value = r.hint ?? '';
  kind.value = r.kind;
  picked.value = [...r.entries];
  onSide.enable = [...(r.on?.enable ?? [])];
  onSide.disable = [...(r.on?.disable ?? [])];
  offSide.enable = [...(r.off?.enable ?? [])];
  offSide.disable = [...(r.off?.disable ?? [])];
});

const filtered = computed(() => {
  const qq = q.value.trim();
  return rows.value.filter(r => !qq || r.name.includes(qq));
});

function toggleList(list: string[], name: string): void {
  const i = list.indexOf(name);
  if (i >= 0) list.splice(i, 1);
  else list.push(name);
}

function addToPack(name: string): void {
  const map = {
    onEnable: onSide.enable,
    onDisable: onSide.disable,
    offEnable: offSide.enable,
    offDisable: offSide.disable,
  } as const;
  toggleList(map[packTarget.value], name);
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
  goHome();
}

function restore(): void {
  if (src.value?.builtin) resetRule(src.value.id);
}
</script>

<template>
  <p v-if="!src" class="pb-empty">找不到这条规则。</p>
  <template v-else>
    <p class="pb-hint">{{ src.builtin ? '出厂规则，改完立刻生效。不对可以恢复。' : '这是你自己建的。' }}</p>
    <input v-model="name" class="pb-input" placeholder="名字" />
    <input v-model="hint" class="pb-input" placeholder="给自己看的说明（可空）" />

    <template v-if="kind !== 'pack'">
      <p class="pb-hint">勾进这组的条目</p>
      <input v-model="q" class="pb-search" placeholder="搜索" />
      <button
        v-for="row in filtered"
        :key="row.identifier"
        class="pb-row"
        :class="{ 'is-on': picked.includes(row.name) }"
        type="button"
        @click="toggleList(picked, row.name)"
      >
        <span class="ttl">{{ row.name }}</span>
      </button>
    </template>

    <template v-else>
      <p class="pb-hint">打开时要打开的</p>
      <input v-model="q" class="pb-search" placeholder="搜索后点条目加入对应列表" />
      <div class="pb-chips" style="margin-bottom: 8px">
        <span class="pb-chip" v-for="n in onSide.enable" :key="'oe' + n" @click="toggleList(onSide.enable, n)">{{ n }} ×</span>
      </div>
      <p class="pb-hint">打开时要关掉的</p>
      <div class="pb-chips" style="margin-bottom: 8px">
        <span class="pb-chip" v-for="n in onSide.disable" :key="'od' + n" @click="toggleList(onSide.disable, n)">{{ n }} ×</span>
      </div>
      <p class="pb-hint">关闭时要打开的（比如防止发情。不想要就从这里拿掉）</p>
      <div class="pb-chips" style="margin-bottom: 8px">
        <span class="pb-chip" v-for="n in offSide.enable" :key="'fe' + n" @click="toggleList(offSide.enable, n)">{{ n }} ×</span>
      </div>
      <p class="pb-hint">关闭时要关掉的</p>
      <div class="pb-chips" style="margin-bottom: 8px">
        <span class="pb-chip" v-for="n in offSide.disable" :key="'fd' + n" @click="toggleList(offSide.disable, n)">{{ n }} ×</span>
      </div>
      <p class="pb-hint">先选要改哪一份名单，再点下面的条目加进去或拿掉。</p>
      <div class="pb-chips" style="margin-bottom: 8px">
        <button class="pb-chip" :class="{ 'is-on': packTarget === 'onEnable' }" type="button" @click="packTarget = 'onEnable'">打开时打开</button>
        <button class="pb-chip" :class="{ 'is-on': packTarget === 'onDisable' }" type="button" @click="packTarget = 'onDisable'">打开时关掉</button>
        <button class="pb-chip" :class="{ 'is-on': packTarget === 'offEnable' }" type="button" @click="packTarget = 'offEnable'">关闭时打开</button>
        <button class="pb-chip" :class="{ 'is-on': packTarget === 'offDisable' }" type="button" @click="packTarget = 'offDisable'">关闭时关掉</button>
      </div>
      <button
        v-for="row in filtered.slice(0, 80)"
        :key="row.identifier"
        class="pb-row"
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
