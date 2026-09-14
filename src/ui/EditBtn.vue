<script setup lang="ts">
defineProps<{ label?: string }>();
</script>

<template>
  <button class="pb-icon-btn pb-sec-edit" type="button" :aria-label="label || '改规则'">
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      />
    </svg>
  </button>
</template>
