<script setup lang="ts">
import { promptRows, removeRule, resetRule, settings, upsertRule } from '@/state/store';
import { back, goHome } from '@/state/ui';
import type { LadderTier, PackSide, PromptRow, Rule, RuleKind } from '@/types';
import { uid } from '@/version';
import { computed, onMounted, reactive, ref } from 'vue';
import KindPick from '@/ui/KindPick.vue';
import TagList from '@/ui/TagList.vue';

const props = defineProps<{ id?: string }>();
const src = computed(() => (props.id ? settings.rules.find(r => r.id === props.id) : undefined));
const name = ref('');
const hint = ref('');
const kind = ref<RuleKind>('group');
const picked = ref<string[]>([]);
const onSide = reactive<PackSide>({ enable: [], disable: [] });
const extraOff = ref(false);
const extraEnable = ref<string[]>([]);
const packMode = ref<'enable' | 'disable' | 'extra'>('enable');
const tiers = ref<LadderTier[]>([{ name: '1 档', entries: [] }]);
const tierIndex = ref(0);
const q = ref('');
const rows = ref<PromptRow[]>([]);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    rows.value = await promptRows();
  } catch {
    rows.value = [];
  }
  loading.value = false;
  const r = src.value;
  if (!r) return;
  name.value = r.name;
  hint.value = r.hint ?? '';
  kind.value = r.kind;
  picked.value = [...r.entries];
  onSide.enable = [...(r.on?.enable ?? [])];
  onSide.disable = [...(r.on?.disable ?? [])];
  extraEnable.value = [...(r.off?.enable ?? [])];
  extraOff.value = extraEnable.value.length > 0;
  tiers.value = r.tiers?.length ? r.tiers.map(t => ({ name: t.name, entries: [...t.entries] })) : [{ name: '1 档', entries: [] }];
});

const filtered = computed(() => {
  const qq = q.value.trim();
  const seen = new Set<string>();
  const out: PromptRow[] = [];
  for (const row of rows.value) {
    if (seen.has(row.name)) continue;
    if (qq && !row.name.includes(qq)) continue;
    seen.add(row.name);
    out.push(row);
  }
  return out;
});

const editingList = computed(() => {
  if (kind.value === 'pack') {
    if (packMode.value === 'enable') return onSide.enable;
    if (packMode.value === 'disable') return onSide.disable;
    return extraEnable.value;
  }
  if (kind.value === 'ladder') return tiers.value[tierIndex.value]?.entries ?? [];
  return picked.value;
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

function addTier(): void {
  tiers.value.push({ name: `${tiers.value.length + 1} 档`, entries: [] });
  tierIndex.value = tiers.value.length - 1;
}

function dropTier(i: number): void {
  if (tiers.value.length <= 1) return;
  tiers.value.splice(i, 1);
  if (tierIndex.value >= tiers.value.length) tierIndex.value = tiers.value.length - 1;
}

function canSave(): boolean {
  if (!name.value.trim()) return false;
  if (kind.value === 'pack') return onSide.enable.length + onSide.disable.length > 0;
  if (kind.value === 'ladder') return tiers.value.some(t => t.entries.length > 0);
  return picked.value.length > 0;
}

function save(): void {
  error.value = '';
  if (!canSave()) {
    error.value = kind.value === 'ladder' ? '至少给一档勾几条。' : kind.value === 'pack' ? '打开或关掉至少勾一条。' : '至少勾一条。';
    return;
  }
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
    hint: hint.value.trim() || undefined,
    packGroup: src.value?.packGroup,
    entries: kind.value === 'pack' || kind.value === 'ladder' ? [] : [...picked.value],
    on: kind.value === 'pack' ? { enable: [...onSide.enable], disable: [...onSide.disable] } : undefined,
    off,
    tiers: kind.value === 'ladder' ? tiers.value.map(t => ({ name: t.name.trim() || '档', entries: [...t.entries] })) : undefined,
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
  hint.value = r.hint ?? '';
  kind.value = r.kind;
  picked.value = [...r.entries];
  onSide.enable = [...(r.on?.enable ?? [])];
  onSide.disable = [...(r.on?.disable ?? [])];
  extraEnable.value = [...(r.off?.enable ?? [])];
  extraOff.value = extraEnable.value.length > 0;
  tiers.value = r.tiers?.length ? r.tiers.map(t => ({ name: t.name, entries: [...t.entries] })) : [{ name: '1 档', entries: [] }];
}

function toggleExtra(): void {
  extraOff.value = !extraOff.value;
  packMode.value = extraOff.value ? 'extra' : 'enable';
}

function onDelete(): void {
  if (!src.value) return;
  if (!window.confirm(`删除「${src.value.name}」？`)) return;
  removeRule(src.value.id);
  goHome();
}
</script>

<template>
  <p class="pb-hint">
    {{ src ? '改名字、备注、条目。保存后主页立刻变成这样。' : '起名、写一句备注、选怎么用，再勾条目。' }}
  </p>
  <input v-model="name" class="pb-input" placeholder="名字，比如：一键人设" />
  <input v-model="hint" class="pb-input" placeholder="备注，比如：一次加一层。给以后的自己看。" />
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
    <button class="pb-row" :class="{ 'is-on': extraOff }" type="button" @click="toggleExtra">
      <span class="ttl">关掉时还要打开别的<small>比如 NSFW 关掉时打开「防止发情」。一般不用开。</small></span>
      <span class="pb-switch" :class="{ 'is-on': extraOff }" />
    </button>
    <template v-if="extraOff">
      <button class="pb-seg-btn is-on" type="button" @click="packMode = 'extra'">关掉时打开 {{ extraEnable.length }}</button>
      <TagList :items="extraEnable" empty="还没选。" @remove="n => toggle(n)" />
    </template>
  </template>

  <template v-else-if="kind === 'ladder'">
    <p class="pb-hint">从低到高。选更高档会把更低档也打开。点一档再在下面勾条目。</p>
    <div v-for="(t, i) in tiers" :key="i" class="pb-card" :class="{ 'is-on': tierIndex === i }">
      <button class="pb-card-hit" type="button" @click="tierIndex = i">
        <input
          class="pb-input pb-tier-name"
          :value="t.name"
          placeholder="这一档叫什么"
          @click.stop
          @input="t.name = ($event.target as HTMLInputElement).value"
        />
      </button>
      <div class="pb-card-ops">
        <button class="pb-btn danger" type="button" :disabled="tiers.length <= 1" @click="dropTier(i)">删档</button>
      </div>
    </div>
    <button class="pb-btn" type="button" @click="addTier">加一档</button>
    <p class="pb-label">第 {{ tierIndex + 1 }} 档要开的条目</p>
    <TagList :items="tiers[tierIndex]?.entries ?? []" empty="还没勾。" @remove="n => toggle(n)" />
  </template>

  <template v-else>
    <p class="pb-hint">勾进这组的条目。已选 {{ picked.length }} 条。</p>
    <TagList :items="picked" empty="还没勾。" @remove="n => toggle(n)" />
  </template>

  <p v-if="error" class="pb-warn">{{ error }}</p>
  <p v-if="loading" class="pb-hint">正在读当前预设的条目…</p>
  <p v-else-if="!rows.length" class="pb-hint">读不到条目。先确认酒馆已经加载 Chat Completion 预设。</p>
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
      <button class="pb-btn primary" type="button" @click="save">保存</button>
      <button v-if="src?.builtin" class="pb-btn" type="button" @click="restore">恢复出厂</button>
      <button v-if="src" class="pb-btn danger" type="button" @click="onDelete">删除</button>
    </div>
  </div>
</template>
