<script setup lang="ts">
import { closeSheet, back, ui } from '@/state/ui';
import { currentProfile, dirty, saveDraftAndApply } from '@/state/store';
import HomeView from '@/ui/HomeView.vue';
import ProfileEditView from '@/ui/ProfileEditView.vue';
import RuleEditView from '@/ui/RuleEditView.vue';
import CreateRuleView from '@/ui/CreateRuleView.vue';
import FineTuneView from '@/ui/FineTuneView.vue';
import LorePickView from '@/ui/LorePickView.vue';
import GroupEditView from '@/ui/GroupEditView.vue';
import { computed } from 'vue';

const active = computed(() => currentProfile());
const nested = computed(() => ui.view.name !== 'home');
const title = computed(() => {
  switch (ui.view.name) {
    case 'profile-edit':
      return '编辑方案';
    case 'rule-edit':
      return '编辑规则';
    case 'rule-create':
      return '新建一组按钮';
    case 'group-edit':
      return '改这一组';
    case 'fine':
      return '细调条目';
    case 'lore-pick':
      return '加入世界书';
    default:
      return active.value ? `现在：${active.value.name}` : '预设球';
  }
});
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
      <GroupEditView v-else-if="ui.view.name === 'group-edit'" :group="ui.view.group" />
      <FineTuneView v-else-if="ui.view.name === 'fine'" />
      <LorePickView v-else-if="ui.view.name === 'lore-pick'" />
    </div>
    <footer v-if="ui.view.name === 'home'" class="pb-foot">
      <p class="pb-now">{{ active ? `现在是「${active.name}」` : '还没选方案' }}</p>
      <p class="pb-hint">{{ dirty ? '上面改的还没写进酒馆。' : '点方案名字会立刻套用。改开关后再保存。' }}</p>
      <div v-if="dirty" class="pb-actions">
        <button class="pb-btn primary" type="button" @click="saveDraftAndApply">保存并套用</button>
      </div>
    </footer>
  </section>
</template>
