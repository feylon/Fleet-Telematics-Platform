<template>
  <span class="badge" :style="{ backgroundColor: `color-mix(in srgb, ${color} 13%, white)`, color }">
    <span class="h-1.5 w-1.5 rounded-full" :class="value === 'EMERGENCY' ? 'pulse-emergency' : ''" :style="{ backgroundColor: color }" />
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { severityColor, statusColor } from '~/utils/status';

const props = defineProps<{ value: string; kind?: 'live' | 'vehicle' | 'order' | 'severity' | 'report' }>();
const { t, te } = useI18n();

const palette: Record<string, string> = {
  ACTIVE: '#16a34a',
  MAINTENANCE: '#f59e0b',
  OUT_OF_SERVICE: '#6b7280',
  CREATED: '#64748b',
  ASSIGNED: '#0ea5e9',
  IN_PROGRESS: '#2563eb',
  COMPLETED: '#16a34a',
  CANCELLED: '#dc2626',
  queued: '#64748b',
  processing: '#f59e0b',
  ready: '#16a34a',
  failed: '#dc2626',
  up: '#16a34a',
  down: '#dc2626',
};

const color = computed(() => {
  if (props.kind === 'live') return statusColor(props.value);
  if (props.kind === 'severity') return severityColor(props.value);
  return palette[props.value] ?? statusColor(props.value);
});

const label = computed(() => (te(`status.${props.value}`) ? t(`status.${props.value}`) : te(`alerts.${props.value}`) ? t(`alerts.${props.value}`) : props.value));
</script>
