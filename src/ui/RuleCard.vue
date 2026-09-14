<script setup lang="ts">
import {
  addRuleEntry,
  applyPack,
  isOn,
  ladderLevel,
  packIsOn,
  promptRows,
  removeRule,
  removeRuleEntry,
  setLadderLevel,
  toggleMutex,
  toggleName,
} from '@/state/store';
import { go } from '@/state/ui';
import type { PromptRow, Rule } from '@/types';
import { computed, ref } from 'vue';

const props = defineProps<{ rule: Rule }>();
const open = ref(false);
const adding = ref(false);
const q = ref('');
const rows = ref<PromptRow[]>([]);

const drawerItems = computed(() => {
  const r = props.rule;
  if (r.kind === 'pack') return [...(r.on?.enable ?? []), ...(r.on?.disable ?? []).filter(n => !(r.on?.enable ?? []).includes(n))];
  if (r.kind === 'ladder') return r.tiers?.flatMap(t => t.entries) ?? [];
  return r.entries;
});

const filteredAdd = computed(() => {
  const have = new Set(drawerItems.value);
  const qq = q.value.trim();
  return rows.value.filter(row => !have.has(row.name) && (!qq || row.name.includes(qq)));
});

const level = computed(() => ladderLevel(props.rule));
const packOn = computed(() => (props.rule.kind === 'pack' ? packIsOn(props.rule) : false));

async function ensureRows(): Promise<void> {
  if (rows.value.length) return;
  rows.value = await promptRows();
}

async function toggleDrawer(): Promise<void> {
  open.value = !open.value;
  if (open.value) await ensureRows();
}

async function tapMaster(): Promise<void> {
  if (props.rule.kind === 'pack') await applyPack(props.rule, !packOn.value);
}

async function tapEntry(name: string): Promise<void> {
  if (props.rule.kind === 'mutex') await toggleMutex(props.rule, name);
  else await toggleName(name, !isOn(name));
}

function dropEntry(name: string): void {
  removeRuleEntry(props.rule, name);
}

async function startAdd(): Promise<void> {
  adding.value = true;
  q.value = '';
  await ensureRows();
}

function pickAdd(name: string): void {
  addRuleEntry(props.rule, name);
  adding.value = false;
}

function onDelete(): void {
  if (!window.confirm(`删除「${props.rule.name}」整块？`)) return;
  removeRule(props.rule.id);
}

async function tapTier(i: number): Promise<void> {
  const next = level.value === i + 1 ? i : i + 1;
  await setLadderLevel(props.rule, next);
}
</script>

<template>
  <section class="pb-block pb-rule">
    <div class="pb-card" :class="{ 'is-on': packOn }">
      <button
        class="pb-card-hit"
        type="button"
        @click="rule.kind === 'pack' ? tapMaster() : toggleDrawer()"
      >
        <span class="ttl">
          {{ rule.name }}
          <small v-if="rule.hint">{{ rule.hint }}</small>
          <small v-else-if="rule.kind === 'pack'">点一下开一组。箭头里改具体条目。</small>
          <small v-else-if="rule.kind === 'mutex'">只能开一条。</small>
          <small v-else-if="rule.kind === 'ladder'">档位，一次加一层。</small>
          <small v-else>里面每条自己开关。</small>
        </span>
        <span v-if="rule.kind === 'pack'" class="pb-switch" :class="{ 'is-on': packOn }" />
      </button>
      <div class="pb-card-ops">
        <button class="pb-icon-btn pb-chevron" :class="{ 'is-open': open }" type="button" aria-label="展开" @click="toggleDrawer">
          ▾
        </button>
        <button class="pb-btn" type="button" @click="go({ name: 'rule-edit', id: rule.id })">改</button>
        <button class="pb-btn danger" type="button" @click="onDelete">删</button>
      </div>
    </div>

    <div v-if="rule.kind === 'ladder'" class="pb-chips pb-rule-chips">
      <button
        v-for="(t, i) in rule.tiers ?? []"
        :key="i"
        class="pb-chip"
        :class="{ 'is-on': level >= i + 1 }"
        type="button"
        @click="tapTier(i)"
      >
        {{ i + 1 }} {{ t.name }}
      </button>
    </div>

    <div v-if="open" class="pb-drawer">
      <p class="pb-hint">点条目改开合。× 是从这一组拿掉，不是关酒馆里的开关。</p>
      <button
        v-for="n in drawerItems"
        :key="n"
        class="pb-row"
        :class="{ 'is-on': isOn(n) }"
        type="button"
        @click="tapEntry(n)"
      >
        <span class="ttl">{{ n }}</span>
        <span class="pb-switch" :class="{ 'is-on': isOn(n) }" />
        <button class="pb-tag-x" type="button" :aria-label="`从这组去掉 ${n}`" @click.stop="dropEntry(n)">×</button>
      </button>
      <p v-if="!drawerItems.length" class="pb-hint">这组还是空的。点下面加一条。</p>
      <div class="pb-actions">
        <button class="pb-btn" type="button" @click="startAdd">加一条</button>
      </div>
      <template v-if="adding">
        <input v-model="q" class="pb-search" placeholder="搜索条目，点一下加入" />
        <button v-for="row in filteredAdd.slice(0, 40)" :key="row.identifier" class="pb-row" type="button" @click="pickAdd(row.name)">
          <span class="ttl">{{ row.name }}</span>
        </button>
        <p v-if="!filteredAdd.length" class="pb-hint">没有可加的条目。换个关键词，或先加载当前预设。</p>
        <button class="pb-btn ghost" type="button" @click="adding = false">收起</button>
      </template>
    </div>
  </section>
</template>
