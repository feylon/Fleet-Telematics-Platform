<template>
  <div class="card flex h-full flex-col">
    <div class="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
      <span class="text-sm font-semibold">{{ t('alerts.center') }}</span>
      <span v-if="live.unread > 0" class="rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{{ live.unread }}</span>
      <div class="ml-auto flex items-center gap-1">
        <label class="btn-secondary btn-xs cursor-pointer"><input v-model="live.soundEnabled" type="checkbox" class="mr-1" />🔊 {{ t('alerts.sound') }}</label>
        <button class="btn-secondary btn-xs" @click="live.markRead()">{{ t('alerts.markRead') }}</button>
      </div>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto">
      <div v-if="live.alerts.length === 0" class="p-4 text-center text-xs text-slate-400">{{ t('alerts.empty') }}</div>
      <button v-for="(alert, index) in live.alerts" :key="`${alert.timestamp}-${index}`" class="flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50" @click="emit('focus', alert)">
        <span class="mt-1 h-2.5 w-2.5 flex-none rounded-full" :class="alert.severity === 'CRITICAL' ? 'bg-red-600 pulse-emergency' : alert.severity === 'WARNING' ? 'bg-amber-500' : 'bg-sky-500'" />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 text-xs">
            <span class="font-semibold">{{ t(`alerts.${alert.alertType}`) }}</span>
            <span class="ml-auto text-slate-400">{{ formatDateTime(alert.timestamp) }}</span>
          </div>
          <div class="truncate text-xs text-slate-600">{{ alert.details }}</div>
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
</script>
