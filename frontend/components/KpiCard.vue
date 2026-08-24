<template>
  <div class="card card-body flex items-start gap-3">
    <span class="flex h-10 w-10 flex-none items-center justify-center rounded-xl" :style="{ backgroundColor: `color-mix(in srgb, ${tone} 14%, white)`, color: tone }">
      <Icon :name="icon ?? 'activity'" :size="20" />
    </span>
    <div class="min-w-0">
      <div class="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ label }}</div>
      <div class="mt-0.5 flex items-baseline gap-1">
        <span class="tabular text-[22px] font-bold leading-tight tracking-tight text-slate-900">{{ value }}</span>
        <span v-if="unit" class="text-xs font-medium text-slate-500">{{ unit }}</span>
      </div>
      <div v-if="hint" class="mt-0.5 truncate text-[11px] text-slate-400">{{ hint }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ label: string; value: string | number; unit?: string; hint?: string; icon?: string; color?: string }>();
const tone = computed(() => props.color ?? 'var(--color-primary)');
</script>
