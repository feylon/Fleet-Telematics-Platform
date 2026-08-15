<template>
  <div class="mb-3 flex flex-wrap items-center gap-2">
    <h2 class="text-lg font-semibold text-slate-800">{{ title }}</h2>
    <p v-if="subtitle" class="text-xs text-slate-500">{{ subtitle }}</p>
    <div class="ml-auto flex flex-wrap items-center gap-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>();
</script>
