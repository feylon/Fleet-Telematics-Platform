<template>
  <div class="flex flex-wrap items-center gap-3">
    <div class="min-w-0">
      <h2 class="text-xl font-bold tracking-tight text-slate-900">{{ title }}</h2>
      <p v-if="subtitle" class="text-xs text-slate-500">{{ subtitle }}</p>
    </div>
    <div class="ml-auto flex flex-wrap items-center gap-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>();
</script>
