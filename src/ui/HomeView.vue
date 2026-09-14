<script setup lang="ts">
import { HOME_SECTIONS } from '@/catalog/groups';
import {
  JAILBREAK_TIERS,
  applyPack,
  bindCurrentChat,
  getGlobalWorlds,
  isOn,
  jailbreakLevel,
  packClash,
  packIsOn,
  applyProfile,
  currentProfile,
  dirty,
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
import EditBtn from '@/ui/EditBtn.vue';
import SecHead from '@/ui/SecHead.vue';

const globals = ref<string[]>([]);
const bind = computed(() => readBinding());
const boundProfile = computed(() => settings.profiles.find(p => p.id === bind.value?.profileId) ?? null);
const active = computed(() => currentProfile());

const skeletons: Array<{ id: string; label: string }> = [
  { id: 'pack-original', label: '原创' },
  { id: 'pack-fanfic', label: '同人' },
  { id: 'pack-charcard', label: '角色卡' },
  { id: 'pack-light', label: '少作业' },
];
const ethics = computed(() =>
  HOME_SECTIONS.ethics.ruleIds.map(id => settings.rules.find(r => r.id === id)).filter((r): r is Rule => Boolean(r)),
);
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

function editSection(key: string): void {
  const spec = HOME_SECTIONS[key];
  if (!spec) return;
  if (spec.ruleIds.length === 1) {
    go({ name: 'rule-edit', id: spec.ruleIds[0] });
    return;
  }
  go({ name: 'group-edit', group: key });
}

async function tapPack(id: string): Promise<void> {
  const rule = ruleById(id);
  if (!rule) return;
  await applyPack(rule, !packIsOn(rule));
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
  const extra = p.builtin ? '出厂方案删了以后，可在扩展设置里点「补回出厂方案」。' : '';
  if (!window.confirm(`删除方案「${p.name}」？${extra}`)) return;
  removeProfile(p.id);
}

async function tapProfile(p: Profile): Promise<void> {
  await applyProfile(p);
}

function saveNew(): void {
  const name = window.prompt('给这个方案起个名', '未命名方案');
  if (name == null) return;
  addProfileFromCurrent(name);
}

function ethicsLabel(name: string): string {
  return name.replace(/^伦理：/, '');
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
    <p class="pb-now">{{ active ? `现在是「${active.name}」` : '还没选方案' }}<template v-if="dirty"> · 有改动还没写进酒馆</template></p>
    <p class="pb-hint">点名字立刻套用。改开关之后再点底部「保存并套用」。</p>
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
      <button class="pb-btn primary" type="button" @click="saveNew">把现在存成方案</button>
    </div>
  </section>

  <section class="pb-block">
    <SecHead title="骨架">
      <EditBtn label="改骨架规则" @click="editSection('skeleton')" />
    </SecHead>
    <div class="pb-chips">
      <button
        v-for="s in skeletons"
        :key="s.id"
        class="pb-chip"
        :class="{ 'is-on': ruleById(s.id) ? packIsOn(ruleById(s.id)!) : false, alert: ruleById(s.id) ? packClash(ruleById(s.id)!) : false }"
        type="button"
        @click="tapPack(s.id)"
      >
        {{ s.label }}
      </button>
    </div>
  </section>

  <section class="pb-block">
    <SecHead title="人设三条">
      <EditBtn label="改人设三条规则" @click="editSection('persona')" />
    </SecHead>
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
    <SecHead title="恋爱伦理">
      <EditBtn label="改恋爱伦理规则" @click="editSection('ethics')" />
    </SecHead>
    <p class="pb-hint">可以叠着开。打架会在上面标红，你自己决定要不要改规则。</p>
    <div class="pb-chips">
      <button
        v-for="e in ethics"
        :key="e.id"
        class="pb-chip"
        :class="{ 'is-on': packIsOn(e), alert: packClash(e) }"
        type="button"
        @click="tapEthics(e)"
      >
        {{ ethicsLabel(e.name) }}
      </button>
    </div>
  </section>

  <section class="pb-block">
    <SecHead title="NSFW">
      <EditBtn label="改 NSFW 规则" @click="editSection('nsfw')" />
    </SecHead>
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
    <h2>我的按钮</h2>
    <p class="pb-hint">自己做一组开关、单选、或一键开一组。</p>
    <div v-for="r in userMine" :key="r.id" class="pb-card">
      <button
        class="pb-card-hit"
        type="button"
        @click="r.kind === 'pack' ? applyPack(r, !packIsOn(r)) : go({ name: 'rule-edit', id: r.id })"
      >
        <span class="ttl">
          {{ r.name }}
          <small>{{ r.kind === 'mutex' ? '只能开一个' : r.kind === 'pack' ? '点一下开一组' : '一组开关' }}</small>
        </span>
      </button>
      <div class="pb-card-ops">
        <button class="pb-btn" type="button" @click="go({ name: 'rule-edit', id: r.id })">改</button>
      </div>
    </div>
    <p v-if="!userMine.length" class="pb-empty">还没有自己的组。</p>
    <button class="pb-btn primary" type="button" @click="go({ name: 'rule-create' })">新建一组</button>
  </section>

  <section class="pb-block">
    <h2>细调</h2>
    <button class="pb-btn" type="button" @click="go({ name: 'fine' })">打开全部条目</button>
  </section>
</template>
