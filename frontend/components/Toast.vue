<template>
  <div class="pointer-events-none fixed right-3 top-3 z-[1000] flex w-80 flex-col gap-2">
    <div v-for="item in toast.items" :key="item.id" class="pointer-events-auto rounded-md border-l-4 bg-white p-3 shadow-lg" :class="classes[item.kind]">
      <div class="flex items-start gap-2">
        <div class="min-w-0 flex-1">
          <div v-if="item.title" class="text-xs font-semibold uppercase text-slate-500">{{ translateTitle(item.title) }}</div>
          <div class="text-sm text-slate-800">{{ item.text }}</div>
        </div>
        <button class="text-slate-400 hover:text-slate-700" @click="toast.dismiss(item.id)">✕</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '~/stores/toast';

const toast = useToastStore();
const { t, te } = useI18n();

const classes: Record<string, string> = {
  info: 'border-sky-500',
  success: 'border-green-500',
  warning: 'border-amber-500',
  error: 'border-red-600',
};

const translateTitle = (title: string): string => (te(`alerts.${title}`) ? t(`alerts.${title}`) : title);
</script>
