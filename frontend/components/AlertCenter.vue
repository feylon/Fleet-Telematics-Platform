<template>
  <div class="card flex h-full flex-col overflow-hidden">
    <div class="card-header">
      <Icon name="bell" :size="17" class="text-[var(--color-primary)]" />
      <span class="card-title">{{ t('alerts.center') }}</span>
      <span v-if="live.unread > 0" class="rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{{ live.unread }}</span>
      <div class="ml-auto flex items-center gap-1">
        <button class="btn-ghost btn-icon btn-sm" :class="live.soundEnabled ? 'text-[var(--color-primary)]' : 'text-slate-400'" :title="t('alerts.sound')" @click="live.soundEnabled = !live.soundEnabled"><Icon :name="live.soundEnabled ? 'volume' : 'volume-x'" :size="16" /></button>
        <button class="btn-ghost btn-icon btn-sm" :title="t('alerts.markRead')" @click="live.markRead()"><Icon name="check-circle" :size="16" /></button>
      </div>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto">
      <div v-if="live.alerts.length === 0" class="flex flex-col items-center gap-2 p-8 text-center text-xs text-slate-400">
        <span class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"><Icon name="shield" :size="18" /></span>
        {{ t('alerts.empty') }}
      </div>
      <button v-for="(alert, index) in live.alerts" :key="`${alert.timestamp}-${index}`" class="flex w-full items-start gap-2.5 border-b border-slate-100 px-3 py-2.5 text-left transition-colors hover:bg-slate-50" @click="emit('focus', alert)">
        <span class="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full" :class="alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : alert.severity === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'">
          <Icon :name="iconFor(alert.alertType)" :size="14" :class="alert.severity === 'CRITICAL' ? 'pulse-emergency' : ''" />
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 text-xs">
            <span class="truncate font-semibold text-slate-800">{{ t(`alerts.${alert.alertType}`) }}</span>
            <span class="tabular ml-auto flex-none text-[10px] text-slate-400">{{ formatDateTime(alert.timestamp).slice(11) }}</span>
          </div>
          <div class="truncate text-xs text-slate-500">{{ alert.details }}</div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLiveStore, type LiveAlert } from '~/stores/live';
import { formatDateTime } from '~/utils/format';

const emit = defineEmits<{ focus: [alert: LiveAlert] }>();
const { t } = useI18n();
const live = useLiveStore();

const iconFor = (type: string): string => {
  const map: Record<string, string> = { SPEEDING: 'gauge', GEOFENCE_EXIT: 'hexagon', GEOFENCE_ENTER: 'hexagon', HARSH_BRAKE: 'alert-triangle', FUEL_DROP: 'fuel', UNAUTHORIZED_STOP: 'clock', ROUTE_DEVIATION: 'route', SOS: 'zap', TIME_WINDOW_VIOLATION: 'clock' };
  return map[type] ?? 'bell';
};
</script>
