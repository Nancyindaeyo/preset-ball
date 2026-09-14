<script setup lang="ts">
import { promptRows, removeRule, resetRule, settings, upsertRule } from '@/state/store';
import { back, goHome } from '@/state/ui';
import type { PackSide, PromptRow, Rule, RuleKind } from '@/types';
import { uid } from '@/version';
import { computed, onMounted, reactive, ref } from 'vue';
import KindPick from '@/ui/KindPick.vue';
import TagList from '@/ui/TagList.vue';

const props = defineProps<{ id?: string }>();
const src = computed(() => (props.id ? settings.rules.find(r => r.id === props.id) : undefined));
const name = ref('');
const kind = ref<RuleKind>('group');
const picked = ref<string[]>([]);
const onSide = reactive<PackSide>({ enable: [], disable: [] });
const extraOff = ref(false);
const extraEnable = ref<string[]>([]);
const packMode = ref<'enable' | 'disable' | 'extra'>('enable');
const q = ref('');
const rows = ref<PromptRow[]>([]);

onMounted(async () => {
  rows.value = await promptRows();
  const r = src.value;
  if (!r) return;
  name.value = r.name;
  kind.value = r.kind;
  picked.value = [...r.entries];
  onSide.enable = [...(r.on?.enable ?? [])];
  onSide.disable = [...(r.on?.disable ?? [])];
  extraEnable.value = [...(r.off?.enable ?? [])];
  extraOff.value = extraEnable.value.length > 0;
});

const filtered = computed(() => {
  const qq = q.value.trim();
  return rows.value.filter(r => !qq || r.name.includes(qq));
});

const editingList = computed(() => {
  if (kind.value !== 'pack') return picked.value;
  if (packMode.value === 'enable') return onSide.enable;
  if (packMode.value === 'disable') return onSide.disable;
  return extraEnable.value;
});

function toggle(item: string): void {
  const list = editingList.value;
  const i = list.indexOf(item);
  if (i >= 0) list.splice(i, 1);
  else list.push(item);
}

function inList(item: string): boolean {
  return editingList.value.includes(item);
}

function save(): void {
  const off: PackSide | undefined =
    kind.value === 'pack'
      ? extraOff.value
        ? { enable: [...extraEnable.value], disable: [...onSide.enable] }
        : { enable: [], disable: [...onSide.enable] }
      : undefined;
  const next: Rule = {
    id: src.value?.id ?? uid('rule'),
    name: name.value.trim() || src.value?.name || '未命名',
    kind: kind.value,
    builtin: src.value?.builtin,
    section: src.value?.section ?? 'mine',
    hint: src.value?.hint,
    packGroup: src.value?.packGroup,
    entries: kind.value === 'pack' ? [] : [...picked.value],
    on: kind.value === 'pack' ? { enable: [...onSide.enable], disable: [...onSide.disable] } : undefined,
    off,
  };
  upsertRule(next);
  if (src.value) back();
  else goHome();
}

function restore(): void {
  if (!src.value?.builtin) return;
  resetRule(src.value.id);
  const r = settings.rules.find(x => x.id === props.id);
  if (!r) return;
  name.value = r.name;
  kind.value = r.kind;
  picked.value = [...r.entries];
  onSide.enable = [...(r.on?.enable ?? [])];
  onSide.disable = [...(r.on?.disable ?? [])];
  extraEnable.value = [...(r.off?.enable ?? [])];
  extraOff.value = extraEnable.value.length > 0;
}

function toggleExtra(): void {
  extraOff.value = !extraOff.value;
  packMode.value = extraOff.value ? 'extra' : 'enable';
}
</script>

<template>
  <p class="pb-hint">
    {{ src?.builtin ? '改完点保存。不对可以恢复出厂。' : '起个名字，选怎么用，勾条目就行。' }}
  </p>
  <input v-model="name" class="pb-input" placeholder="名字，比如：我的海棠包" />
  <KindPick v-model="kind" />

  <template v-if="kind === 'pack'">
    <p class="pb-hint">点这个按钮时：打开哪些、关掉哪些。</p>
    <div class="pb-seg">
      <button class="pb-seg-btn" :class="{ 'is-on': packMode === 'enable' }" type="button" @click="packMode = 'enable'">
        打开 {{ onSide.enable.length }}
      </button>
      <button class="pb-seg-btn" :class="{ 'is-on': packMode === 'disable' }" type="button" @click="packMode = 'disable'">
        关掉 {{ onSide.disable.length }}
      </button>
    </div>
    <TagList
      :items="packMode === 'disable' ? onSide.disable : onSide.enable"
      empty="还没选。下面搜索后点条目。"
      @remove="n => toggle(n)"
    />
    <button
      class="pb-row"
      :class="{ 'is-on': extraOff }"
      type="button"
      @click="toggleExtra"
    >
      <span class="ttl">关掉时还要打开别的<small>比如 NSFW 关掉时打开「防止发情」。一般不用开。</small></span>
      <span class="pb-switch" :class="{ 'is-on': extraOff }" />
    </button>
    <template v-if="extraOff">
      <button class="pb-seg-btn is-on" type="button" @click="packMode = 'extra'">关掉时打开 {{ extraEnable.length }}</button>
      <TagList :items="extraEnable" empty="还没选。" @remove="n => toggle(n)" />
    </template>
  </template>
  <template v-else>
    <p class="pb-hint">勾进这组的条目。已选 {{ picked.length }} 条。</p>
    <TagList :items="picked" empty="还没勾。" @remove="n => toggle(n)" />
  </template>

  <input v-model="q" class="pb-search" placeholder="搜索条目，点一下加入或拿掉" />
  <button
    v-for="row in filtered"
    :key="row.identifier"
    class="pb-row"
    :class="{ 'is-on': inList(row.name) }"
    type="button"
    @click="toggle(row.name)"
  >
    <span class="ttl">{{ row.name }}</span>
  </button>

  <div class="pb-foot">
    <div class="pb-actions">
      <button class="pb-btn primary" type="button" :disabled="!name.trim()" @click="save">保存</button>
      <button v-if="src?.builtin" class="pb-btn" type="button" @click="restore">恢复出厂</button>
      <button v-else-if="src" class="pb-btn danger" type="button" @click="removeRule(src.id); goHome()">删除</button>
    </div>
  </div>
</template>
