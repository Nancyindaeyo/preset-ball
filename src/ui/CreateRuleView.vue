<script setup lang="ts">
import { promptRows, upsertRule } from '@/state/store';
import { goHome } from '@/state/ui';
import type { PackSide, PromptRow, RuleKind } from '@/types';
import { uid } from '@/version';
import { computed, onMounted, reactive, ref } from 'vue';
import KindPick from '@/ui/KindPick.vue';
import TagList from '@/ui/TagList.vue';

const step = ref(1);
const name = ref('');
const kind = ref<RuleKind>('group');
const picked = ref<string[]>([]);
const onSide = reactive<PackSide>({ enable: [], disable: [] });
const offSide = reactive<PackSide>({ enable: [], disable: [] });
const packTarget = ref<'onEnable' | 'onDisable' | 'offEnable' | 'offDisable'>('onEnable');
const q = ref('');
const rows = ref<PromptRow[]>([]);

onMounted(async () => {
  rows.value = await promptRows();
});

const filtered = computed(() => {
  const qq = q.value.trim();
  return rows.value.filter(r => !qq || r.name.includes(qq));
});

function toggle(list: string[], n: string): void {
  const i = list.indexOf(n);
  if (i >= 0) list.splice(i, 1);
  else list.push(n);
}

function addPack(n: string): void {
  const map = {
    onEnable: onSide.enable,
    onDisable: onSide.disable,
    offEnable: offSide.enable,
    offDisable: offSide.disable,
  } as const;
  toggle(map[packTarget.value], n);
}

function save(): void {
  upsertRule({
    id: uid('rule'),
    name: name.value.trim() || '未命名',
    kind: kind.value,
    section: 'mine',
    entries: kind.value === 'pack' ? [] : [...picked.value],
    on: kind.value === 'pack' ? { enable: [...onSide.enable], disable: [...onSide.disable] } : undefined,
    off: kind.value === 'pack' ? { enable: [...offSide.enable], disable: [...offSide.disable] } : undefined,
  });
  goHome();
}
</script>

<template>
  <div v-if="step === 1">
    <p class="pb-hint">第一步：起个好懂的名字。</p>
    <input v-model="name" class="pb-input" placeholder="例如：我的海棠包" />
    <button class="pb-btn primary" type="button" :disabled="!name.trim()" @click="step = 2">下一步</button>
  </div>

  <div v-else-if="step === 2">
    <KindPick v-model="kind" />
    <div class="pb-actions">
      <button class="pb-btn ghost" type="button" @click="step = 1">上一步</button>
      <button class="pb-btn primary" type="button" @click="step = 3">下一步</button>
    </div>
  </div>

  <div v-else>
    <p class="pb-hint">{{ kind === 'pack' ? '选出打开/关闭时要动的条目。' : '勾选进这组的条目。' }}</p>
    <input v-model="q" class="pb-search" placeholder="搜索条目" />
    <template v-if="kind === 'pack'">
      <div class="pb-seg">
        <button class="pb-seg-btn" :class="{ 'is-on': packTarget === 'onEnable' }" type="button" @click="packTarget = 'onEnable'">打开时打开</button>
        <button class="pb-seg-btn" :class="{ 'is-on': packTarget === 'onDisable' }" type="button" @click="packTarget = 'onDisable'">打开时关掉</button>
        <button class="pb-seg-btn" :class="{ 'is-on': packTarget === 'offEnable' }" type="button" @click="packTarget = 'offEnable'">关闭时打开</button>
        <button class="pb-seg-btn" :class="{ 'is-on': packTarget === 'offDisable' }" type="button" @click="packTarget = 'offDisable'">关闭时关掉</button>
      </div>
      <p class="pb-label">打开时要打开的</p>
      <TagList :items="onSide.enable" @remove="n => toggle(onSide.enable, n)" />
      <p class="pb-label">打开时要关掉的</p>
      <TagList :items="onSide.disable" @remove="n => toggle(onSide.disable, n)" />
      <p class="pb-label">关闭时要打开的</p>
      <TagList :items="offSide.enable" @remove="n => toggle(offSide.enable, n)" />
      <p class="pb-label">关闭时要关掉的</p>
      <TagList :items="offSide.disable" @remove="n => toggle(offSide.disable, n)" />
      <button v-for="row in filtered.slice(0, 80)" :key="row.identifier" class="pb-row" type="button" @click="addPack(row.name)">
        <span class="ttl">{{ row.name }}</span>
      </button>
    </template>
    <template v-else>
      <button
        v-for="row in filtered.slice(0, 80)"
        :key="row.identifier"
        class="pb-row"
        :class="{ 'is-on': picked.includes(row.name) }"
        type="button"
        @click="toggle(picked, row.name)"
      >
        <span class="ttl">{{ row.name }}</span>
      </button>
    </template>
    <div class="pb-actions">
      <button class="pb-btn ghost" type="button" @click="step = 2">上一步</button>
      <button class="pb-btn primary" type="button" @click="save">完成</button>
    </div>
  </div>
</template>
