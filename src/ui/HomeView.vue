<script setup lang="ts">
import {
  applyProfile,
  addProfileFromCurrent,
  bindCurrentChat,
  currentProfile,
  dirty,
  getGlobalWorlds,
  hasFineLayout,
  mothra,
  pullFromHost,
  presetKey,
  readBinding,
  removeLoreShortcut,
  removeProfile,
  saveCurrentProfile,
  schemeDirty,
  settings,
  toggleLore,
  unbindCurrentChat,
  warnings,
} from '@/state/store';
import { askConfirm, go } from '@/state/ui';
import type { Profile, Rule } from '@/types';
import { computed, onMounted, ref } from 'vue';
import RuleCard from '@/ui/RuleCard.vue';

const globals = ref<string[]>([]);
const bind = computed(() => readBinding());
const boundProfile = computed(() => settings.profiles.find(p => p.id === bind.value?.profileId) ?? null);
const active = computed(() => currentProfile());
const unsaved = computed(() => dirty.value || schemeDirty.value);
const homeRules = computed(() => settings.rules.filter((r): r is Rule => r.section !== 'fine'));

onMounted(async () => {
  globals.value = await getGlobalWorlds();
});

async function refreshGlobals(): Promise<void> {
  globals.value = await getGlobalWorlds();
}

async function onLore(id: string): Promise<void> {
  const s = settings.loreShortcuts.find(x => x.id === id);
  if (!s) return;
  await toggleLore(s);
  await refreshGlobals();
}

function confirmDelete(p: Profile): void {
  const extra = p.builtin ? '出厂方案删了以后，可在扩展设置里点「补回出厂方案」。' : '';
  if (!window.confirm(`删除方案「${p.name}」？${extra}`)) return;
  removeProfile(p.id);
}

async function tapProfile(p: Profile): Promise<void> {
  if (unsaved.value && p.id !== settings.activeProfileId) {
    const choice = await askConfirm(`当前方案有没保存的改动。切换到「${p.name}」要放弃吗？`);
    if (choice === 'cancel') return;
    if (choice === 'save') await saveCurrentProfile();
  }
  await applyProfile(p);
  await refreshGlobals();
}

async function saveNow(): Promise<void> {
  await saveCurrentProfile();
  await refreshGlobals();
}

function saveNew(): void {
  const name = window.prompt('给这个方案起个名', '未命名方案');
  if (name == null) return;
  addProfileFromCurrent(name);
}

async function openFine(): Promise<void> {
  if (!presetKey.value) await pullFromHost();
  if (!mothra.value && !hasFineLayout()) go({ name: 'group-setup' });
  else go({ name: 'fine' });
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
    <p class="pb-now">
      {{ active ? `现在是「${active.name}」` : '还没选方案' }}
      <template v-if="unsaved"> · 有改动未保存</template>
    </p>
    <p class="pb-hint">点名字立刻切换。改完开关或世界书后点「保存方案」，和切换不打架。</p>
    <div v-for="p in settings.profiles" :key="p.id" class="pb-card" :class="{ 'is-on': settings.activeProfileId === p.id }">
      <button class="pb-card-hit" type="button" @click="tapProfile(p)">
        <span class="ttl">
          {{ p.name }}
          <small>{{ p.kind === 'patch' ? '起步模板，只改列出的条目' : '完整快照' }}</small>
        </span>
      </button>
      <div class="pb-card-ops">
        <button class="pb-btn" type="button" @click="go({ name: 'profile-edit', id: p.id })">改</button>
        <button class="pb-btn ghost" type="button" @click="bindCurrentChat(p.id)">绑</button>
        <button class="pb-btn danger" type="button" @click="confirmDelete(p)">删</button>
      </div>
    </div>
    <p v-if="!settings.profiles.length" class="pb-empty">还没有方案。把现在的开关存一份就行。</p>
    <div class="pb-actions">
      <button class="pb-btn primary" type="button" @click="saveNow">保存方案</button>
      <button class="pb-btn" type="button" @click="saveNew">另存一份</button>
    </div>
  </section>

  <section class="pb-block">
    <h2>快捷</h2>
    <p class="pb-hint">蛾摩拉的一键和破限在这里。箭头打开抽屉改条目。整块都能删，也可以自己再新建。</p>
    <RuleCard v-for="r in homeRules" :key="r.id" :rule="r" />
    <p v-if="!homeRules.length" class="pb-empty">快捷是空的。下面新建一组。</p>
    <button class="pb-btn primary" type="button" @click="go({ name: 'rule-create' })">新建一组</button>
  </section>

  <section class="pb-block">
    <h2>全局世界书</h2>
    <p class="pb-hint">点一下挂到全局，再点摘掉。保存方案时会记住现在挂着哪些；切换方案会按那份开关快捷书。</p>
    <div
      v-for="s in settings.loreShortcuts"
      :key="s.id"
      class="pb-card"
      :class="{ 'is-on': globals.includes(s.worldName) }"
    >
      <button class="pb-card-hit" type="button" @click="onLore(s.id)">
        <span class="ttl">
          {{ s.name }}
          <small>{{ s.worldName }}</small>
        </span>
        <span class="pb-switch" :class="{ 'is-on': globals.includes(s.worldName) }" />
      </button>
      <div class="pb-card-ops">
        <button class="pb-btn ghost" type="button" @click="removeLoreShortcut(s.id)">去掉</button>
      </div>
    </div>
    <button class="pb-btn" type="button" @click="go({ name: 'lore-pick' })">加入一本</button>
  </section>

  <section class="pb-block">
    <h2>细调</h2>
    <p class="pb-hint">{{ mothra ? '按蛾摩拉文件夹改每一条。' : '其他预设先自己分组，之后就和细调一样用。' }}</p>
    <button class="pb-btn" type="button" @click="openFine">打开全部条目</button>
  </section>
</template>
