<script setup lang="ts">
import RuleForm from '@/ui/RuleForm.vue';

defineProps<{ id: string }>();
</script>

<template>
  <RuleForm :id="id" />
</template>
