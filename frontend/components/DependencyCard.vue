<template>
  <div class="card card-body">
    <div class="flex items-center gap-2">
      <span class="flex h-9 w-9 items-center justify-center rounded-lg" :class="status === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'"><Icon :name="icon" :size="18" /></span>
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-semibold text-slate-800">{{ title }}</div>
      </div>
      <StatusBadge :value="status" />
    </div>
    <dl class="mt-3 space-y-1 text-xs">
      <div v-for="[key, value] in rows" :key="key" class="flex items-center justify-between gap-2"><dt class="truncate text-slate-500">{{ key }}</dt><dd class="tabular font-semibold text-slate-800">{{ value }}</dd></div>
    </dl>
  </div>
</template>

<script setup lang="ts">
defineProps<{ icon: string; title: string; status: string; rows: Array<[string, string | number]> }>();
</script>
