<template>
  <div class="card card-body">
    <div class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ label }}</div>
    <div class="mt-1 flex items-baseline gap-1">
      <span class="text-2xl font-bold text-slate-900">{{ value }}</span>
      <span v-if="unit" class="text-xs text-slate-500">{{ unit }}</span>
    </div>
    <div v-if="hint" class="mt-1 text-xs text-slate-400">{{ hint }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string | number; unit?: string; hint?: string }>();
</script>
