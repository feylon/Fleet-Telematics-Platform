<template>
  <div class="relative inline-flex items-center justify-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" viewBox="0 0 120 120" class="-rotate-90">
      <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" stroke-width="10" />
      <circle cx="60" cy="60" r="52" fill="none" :stroke="color" stroke-width="10" stroke-linecap="round" :stroke-dasharray="circumference" :stroke-dashoffset="offset" style="transition: stroke-dashoffset 0.6s ease" />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <span class="tabular text-3xl font-extrabold tracking-tight" :style="{ color }">{{ display }}</span>
      <span class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ score: number | null | undefined; label: string; size?: number }>();
const size = computed(() => props.size ?? 150);
const circumference = 2 * Math.PI * 52;
const value = computed(() => Math.max(0, Math.min(100, Number(props.score ?? 0))));
const offset = computed(() => circumference * (1 - value.value / 100));
const display = computed(() => (props.score === null || props.score === undefined ? '—' : value.value.toFixed(0)));
const color = computed(() => (value.value >= 80 ? '#16a34a' : value.value >= 60 ? '#f59e0b' : '#dc2626'));
</script>
