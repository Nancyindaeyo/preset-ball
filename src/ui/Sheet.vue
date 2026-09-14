<script setup lang="ts">
import { closeSheet, back, confirmDlg, ui } from '@/state/ui';
import { currentProfile, dirty, saveCurrentProfile, schemeDirty } from '@/state/store';
import HomeView from '@/ui/HomeView.vue';
import ProfileEditView from '@/ui/ProfileEditView.vue';
import RuleEditView from '@/ui/RuleEditView.vue';
import CreateRuleView from '@/ui/CreateRuleView.vue';
import FineTuneView from '@/ui/FineTuneView.vue';
import GroupSetupView from '@/ui/GroupSetupView.vue';
import LorePickView from '@/ui/LorePickView.vue';
import { computed } from 'vue';

const active = computed(() => currentProfile());
const nested = computed(() => ui.view.name !== 'home');
const unsaved = computed(() => dirty.value || schemeDirty.value);
const title = computed(() => {
  switch (ui.view.name) {
    case 'profile-edit':
      return '编辑方案';
    case 'rule-edit':
      return '编辑规则';
    case 'rule-create':
      return '新建一组按钮';
    case 'fine':
      return '细调条目';
    case 'group-setup':
      return '给条目分组';
    case 'lore-pick':
      return '加入世界书';
    default:
      return active.value ? `现在：${active.value.name}` : '预设球';
  }
});

function pick(v: 'save' | 'discard' | 'cancel'): void {
  confirmDlg.resolve?.(v);
}
</script>

<template>
  <button v-if="ui.sheet" class="pb-scrim" type="button" aria-label="关闭" @click="closeSheet" />
  <section v-if="ui.sheet" class="pb-sheet" role="dialog" aria-modal="true">
    <div class="pb-handle" />
    <header class="pb-head">
      <button v-if="nested" class="pb-icon-btn" type="button" aria-label="返回" @click="back">‹</button>
      <h1>{{ title }}</h1>
      <button class="pb-icon-btn" type="button" aria-label="关闭" @click="closeSheet">✕</button>
    </header>
    <div class="pb-body">
      <HomeView v-if="ui.view.name === 'home'" />
      <ProfileEditView v-else-if="ui.view.name === 'profile-edit'" :id="ui.view.id" />
      <RuleEditView v-else-if="ui.view.name === 'rule-edit'" :id="ui.view.id" />
      <CreateRuleView v-else-if="ui.view.name === 'rule-create'" />
      <FineTuneView v-else-if="ui.view.name === 'fine'" />
      <GroupSetupView v-else-if="ui.view.name === 'group-setup'" />
      <LorePickView v-else-if="ui.view.name === 'lore-pick'" />
    </div>
    <footer v-if="ui.view.name === 'home'" class="pb-foot">
      <p class="pb-now">{{ active ? `现在是「${active.name}」` : '还没选方案' }}</p>
      <p class="pb-hint">{{ unsaved ? '有改动还没写进方案。' : '点方案名字会立刻切换。' }}</p>
      <div v-if="unsaved" class="pb-actions">
        <button class="pb-btn primary" type="button" @click="saveCurrentProfile">保存方案</button>
      </div>
    </footer>
    <div v-if="confirmDlg.open" class="pb-modal-scrim">
      <div class="pb-modal" role="alertdialog" aria-modal="true">
        <p class="pb-now">还没保存</p>
        <p class="pb-hint">{{ confirmDlg.text }}</p>
        <div class="pb-actions">
          <button class="pb-btn primary" type="button" @click="pick('save')">先保存</button>
          <button class="pb-btn" type="button" @click="pick('discard')">放弃</button>
          <button class="pb-btn ghost" type="button" @click="pick('cancel')">再想想</button>
        </div>
      </div>
    </div>
  </section>
</template>
