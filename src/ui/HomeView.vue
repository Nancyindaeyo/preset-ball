<script setup lang="ts">
import {
  JAILBREAK_TIERS,
  applyPack,
  applyProfile,
  bindCurrentChat,
  getGlobalWorlds,
  isOn,
  jailbreakLevel,
  packIsOn,
  readBinding,
  removeLoreShortcut,
  removeProfile,
  settings,
  setJailbreakLevel,
  setNsfwStyle,
  toggleLore,
  toggleName,
  unbindCurrentChat,
  warnings,
  addProfileFromCurrent,
} from '@/state/store';
import { go } from '@/state/ui';
import type { Profile, Rule } from '@/types';
import { computed, onMounted, ref } from 'vue';

const globals = ref<string[]>([]);
const bind = computed(() => readBinding());
const boundProfile = computed(() => settings.profiles.find(p => p.id === bind.value?.profileId) ?? null);

const skeletons: Array<{ id: string; label: string }> = [
  { id: 'pack-original', label: '原创' },
  { id: 'pack-fanfic', label: '同人' },
  { id: 'pack-charcard', label: '角色卡' },
  { id: 'pack-light', label: '少作业' },
];
const ethics = computed(() => settings.rules.filter(r => r.packGroup === 'ethics'));
const nsfw = computed(() => settings.rules.find(r => r.id === 'pack-nsfw'));
const jbCheck = computed(() => settings.rules.find(r => r.id === 'jb-check'));
const persona = computed(() => settings.rules.find(r => r.id === 'group-persona'));
const userMine = computed(() => settings.rules.filter(r => !r.builtin));
const level = computed(() => jailbreakLevel());

onMounted(async () => {
  globals.value = await getGlobalWorlds();
});

async function refreshGlobals(): Promise<void> {
  globals.value = await getGlobalWorlds();
}

function ruleById(id: string): Rule | undefined {
  return settings.rules.find(r => r.id === id);
}

async function tapPack(id: string): Promise<void> {
  const rule = ruleById(id);
  if (!rule) return;
  const on = packIsOn(rule);
  await applyPack(rule, !on);
}

async function tapEthics(rule: Rule): Promise<void> {
  await applyPack(rule, !packIsOn(rule));
}

async function tapNsfw(): Promise<void> {
  const rule = nsfw.value;
  if (!rule) return;
  await applyPack(rule, !packIsOn(rule));
}

async function onLore(id: string): Promise<void> {
  const s = settings.loreShortcuts.find(x => x.id === id);
  if (!s) return;
  await toggleLore(s);
  await refreshGlobals();
}

function confirmDelete(p: Profile): void {
  if (!window.confirm(`删除方案「${p.name}」？`)) return;
  removeProfile(p.id);
}

function saveNew(): void {
  const name = window.prompt('给这个方案起个名', '未命名方案');
  if (name == null) return;
  addProfileFromCurrent(name);
}
</script>

<template>
  <div v-if="warnings.length" class="pb-block">
    <div v-for="w in warnings" :key="w.id" class="pb-warn">{{ w.text }}</div>
  </div>

  <section class="pb-block">
    <h2>这个聊天</h2>
    <p v-if="boundProfile" class="pb-hint">已绑定「{{ boundProfile.name }}」。打开这个聊天会自动套用。</p>
    <p v-else class="pb-hint">还没绑定。切走再回来不会改你的开关。</p>
    <div class="pb-actions">
      <button
        v-if="settings.activeProfileId"
        class="pb-btn"
        type="button"
        @click="bindCurrentChat(settings.activeProfileId!)"
      >
        绑定当前方案
      </button>
      <button v-if="bind" class="pb-btn ghost" type="button" @click="unbindCurrentChat">解开</button>
    </div>
  </section>

  <section class="pb-block">
    <h2>方案</h2>
    <p class="pb-hint">点名字立刻套用。点「改」可以开关每一条再保存。</p>
    <button
      v-for="p in settings.profiles"
      :key="p.id"
      class="pb-row"
      :class="{ 'is-on': settings.activeProfileId === p.id }"
      type="button"
      @click="applyProfile(p)"
    >
      <span class="ttl">
        {{ p.name }}
        <small>{{ p.kind === 'patch' ? '起步模板，只改列出的条目' : '完整快照' }}</small>
      </span>
      <span class="pb-actions" @click.stop>
        <button class="pb-btn" type="button" @click="go({ name: 'profile-edit', id: p.id })">改</button>
        <button class="pb-btn ghost" type="button" @click="bindCurrentChat(p.id)">绑</button>
        <button v-if="!p.builtin" class="pb-btn danger" type="button" @click="confirmDelete(p)">删</button>
      </span>
    </button>
    <div class="pb-actions">
      <button class="pb-btn primary" type="button" @click="saveNew">把现在存成方案</button>
    </div>
  </section>

  <section class="pb-block">
    <h2>骨架</h2>
    <div class="pb-chips">
      <button
        v-for="s in skeletons"
        :key="s.id"
        class="pb-chip"
        :class="{ 'is-on': ruleById(s.id) ? packIsOn(ruleById(s.id)!) : false }"
        type="button"
        @click="tapPack(s.id)"
      >
        {{ s.label }}
      </button>
    </div>
  </section>

  <section class="pb-block">
    <h2>人设三条</h2>
    <p class="pb-hint">一般常开。和下面伦理包不是一回事。</p>
    <button
      v-for="n in persona?.entries ?? []"
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

  <section class="pb-block">
    <h2>恋爱伦理（选一个）</h2>
    <div class="pb-chips">
      <button
        v-for="e in ethics"
        :key="e.id"
        class="pb-chip"
        :class="{ 'is-on': packIsOn(e) }"
        type="button"
        @click="tapEthics(e)"
      >
        {{ e.name.replace('伦理：', '') }}
      </button>
    </div>
    <p class="pb-hint">点开会按规则开关一组条目。觉得不对就去改规则。</p>
  </section>

  <section class="pb-block">
    <h2>NSFW</h2>
    <button class="pb-row" :class="{ 'is-on': nsfw && packIsOn(nsfw) }" type="button" @click="tapNsfw">
      <span class="ttl">
        一键 NSFW
        <small>文笔不自动选。你点下面两个记住。</small>
      </span>
      <span class="pb-switch" :class="{ 'is-on': nsfw && packIsOn(nsfw) }" />
    </button>
    <div class="pb-chips">
      <button class="pb-chip" :class="{ 'is-on': settings.nsfwStyle === 'weimei' }" type="button" @click="setNsfwStyle('weimei')">
        唯美
      </button>
      <button class="pb-chip" :class="{ 'is-on': settings.nsfwStyle === 'haitang' }" type="button" @click="setNsfwStyle('haitang')">
        海棠
      </button>
    </div>
    <button class="pb-btn ghost" type="button" @click="nsfw && go({ name: 'rule-edit', id: nsfw.id })">
      改 NSFW 开/关时动哪些条目
    </button>
  </section>

  <section class="pb-block">
    <h2>破限档位</h2>
    <p class="pb-hint">一次加一层。数字越大药越重，智力越容易掉。</p>
    <div class="pb-chips">
      <button
        v-for="t in JAILBREAK_TIERS"
        :key="t.level"
        class="pb-chip"
        :class="{ 'is-on': level >= t.level }"
        type="button"
        @click="setJailbreakLevel(t.level)"
      >
        {{ t.level }} {{ t.name }}
      </button>
    </div>
    <button v-if="jbCheck" class="pb-btn" type="button" @click="applyPack(jbCheck, true)">
      关掉底部 assistant
    </button>
  </section>

  <section class="pb-block">
    <h2>全局世界书</h2>
    <p class="pb-hint">点一下挂到全局，再点摘掉。可同时挂多本。套用方案默认不会动它们。</p>
    <button
      v-for="s in settings.loreShortcuts"
      :key="s.id"
      class="pb-row"
      :class="{ 'is-on': globals.includes(s.worldName) }"
      type="button"
      @click="onLore(s.id)"
    >
      <span class="ttl">
        {{ s.name }}
        <small>{{ s.worldName }}</small>
      </span>
      <span class="pb-switch" :class="{ 'is-on': globals.includes(s.worldName) }" />
      <button class="pb-btn ghost" type="button" @click.stop="removeLoreShortcut(s.id)">去掉</button>
    </button>
    <button class="pb-btn" type="button" @click="go({ name: 'lore-pick' })">加入一本</button>
  </section>

  <section class="pb-block">
    <h2>我的按钮</h2>
    <p class="pb-hint">自己做一组开关、单选、或一键开一组。</p>
    <button
      v-for="r in userMine"
      :key="r.id"
      class="pb-row"
      type="button"
      @click="r.kind === 'pack' ? applyPack(r, !packIsOn(r)) : go({ name: 'rule-edit', id: r.id })"
    >
      <span class="ttl">
        {{ r.name }}
        <small>{{ r.kind === 'mutex' ? '只能开一个' : r.kind === 'pack' ? '点一下开一组' : '一组开关' }}</small>
      </span>
      <button class="pb-btn" type="button" @click.stop="go({ name: 'rule-edit', id: r.id })">改</button>
    </button>
    <p v-if="!userMine.length" class="pb-empty">还没有自己的组。</p>
    <button class="pb-btn primary" type="button" @click="go({ name: 'rule-create' })">新建一组</button>
  </section>

  <section class="pb-block">
    <h2>细调</h2>
    <button class="pb-btn" type="button" @click="go({ name: 'fine' })">打开全部条目</button>
  </section>
</template>
