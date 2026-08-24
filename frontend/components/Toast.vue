<template>
  <div class="pointer-events-none fixed bottom-4 right-4 z-[1000] flex w-[340px] flex-col-reverse gap-2">
    <TransitionGroup name="toast">
      <div v-for="item in toast.items" :key="item.id" class="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/95 p-3 pl-4 shadow-pop backdrop-blur" :class="accent[item.kind]">
        <span class="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full" :class="iconBg[item.kind]"><Icon :name="icons[item.kind]" :size="16" /></span>
        <div class="min-w-0 flex-1">
          <div v-if="item.title" class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ translateTitle(item.title) }}</div>
          <div class="text-[13px] leading-snug text-slate-800">{{ item.text }}</div>
        </div>
        <button class="btn-ghost btn-icon btn-sm -mr-1 -mt-1" @click="toast.dismiss(item.id)"><Icon name="x" :size="14" /></button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '~/stores/toast';

const toast = useToastStore();
const { t, te } = useI18n();

const accent: Record<string, string> = { info: 'border-l-4 border-l-sky-500', success: 'border-l-4 border-l-emerald-500', warning: 'border-l-4 border-l-amber-500', error: 'border-l-4 border-l-red-600' };
const iconBg: Record<string, string> = { info: 'bg-sky-100 text-sky-700', success: 'bg-emerald-100 text-emerald-700', warning: 'bg-amber-100 text-amber-700', error: 'bg-red-100 text-red-700' };
const icons: Record<string, string> = { info: 'info', success: 'check-circle', warning: 'alert-triangle', error: 'alert-circle' };

const translateTitle = (title: string): string => (te(`alerts.${title}`) ? t(`alerts.${title}`) : title);
</script>
