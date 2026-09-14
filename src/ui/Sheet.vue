<script setup lang="ts">
import { closeSheet, goHome, ui } from '@/state/ui';
import HomeView from '@/ui/HomeView.vue';
import ProfileEditView from '@/ui/ProfileEditView.vue';
import RuleEditView from '@/ui/RuleEditView.vue';
import CreateRuleView from '@/ui/CreateRuleView.vue';
import FineTuneView from '@/ui/FineTuneView.vue';
import LorePickView from '@/ui/LorePickView.vue';
import { computed } from 'vue';

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
    case 'lore-pick':
      return '加入世界书';
    default:
      return '预设球';
  }
});

const nested = computed(() => ui.view.name !== 'home');
</script>

<template>
  <button v-if="ui.sheet" class="pb-scrim" type="button" aria-label="关闭" @click="closeSheet" />
  <section v-if="ui.sheet" class="pb-sheet" role="dialog" aria-modal="true">
    <div class="pb-handle" />
    <header class="pb-head">
      <button v-if="nested" class="pb-icon-btn" type="button" aria-label="返回" @click="goHome">‹</button>
      <h1>{{ title }}</h1>
      <button class="pb-icon-btn" type="button" aria-label="关闭" @click="closeSheet">✕</button>
    </header>
    <div class="pb-body">
      <HomeView v-if="ui.view.name === 'home'" />
      <ProfileEditView v-else-if="ui.view.name === 'profile-edit'" :id="ui.view.id" />
      <RuleEditView v-else-if="ui.view.name === 'rule-edit'" :id="ui.view.id" />
      <CreateRuleView v-else-if="ui.view.name === 'rule-create'" />
      <FineTuneView v-else-if="ui.view.name === 'fine'" />
      <LorePickView v-else-if="ui.view.name === 'lore-pick'" />
    </div>
  </section>
</template>
