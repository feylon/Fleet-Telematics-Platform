<template>
  <div class="card overflow-hidden">
    <div class="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
      <span v-if="title" class="card-title">{{ title }}</span>
      <slot name="toolbar" />
      <div class="ml-auto flex items-center gap-3">
        <span class="text-xs text-slate-500"><span class="tabular font-semibold text-slate-700">{{ filtered.length }}</span> {{ t('common.rows') }}</span>
        <ExportButtons v-if="exportable !== false" :title="exportTitle ?? title ?? 'table'" :columns="exportColumns" :rows="exportRows" />
      </div>
    </div>
    <div class="max-h-[70vh] overflow-auto">
      <table class="table-dense w-full">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key" class="cursor-pointer select-none whitespace-nowrap hover:text-slate-800" @click="toggleSort(column.key)">
              <span class="inline-flex items-center gap-1">
                {{ column.label }}
                <Icon v-if="sortKey === column.key" :name="sortDir === 'asc' ? 'chevron-up' : 'chevron-down'" :size="13" class="text-[var(--color-primary)]" />
              </span>
            </th>
            <th v-if="$slots.actions" class="text-right">{{ t('common.actions') }}</th>
          </tr>
          <tr v-if="filterable !== false" class="filter-row">
            <th v-for="column in columns" :key="`f-${column.key}`" class="!top-[33px] !py-1.5 !normal-case !tracking-normal">
              <select v-if="column.options" v-model="filters[column.key]" class="input input-sm font-normal">
                <option value="">{{ t('common.all') }}</option>
                <option v-for="option in column.options" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <div v-else-if="column.filter !== false" class="relative">
                <Icon name="search" :size="13" class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input v-model="filters[column.key]" class="input input-sm !pl-7 font-normal" :placeholder="t('common.filter')" />
              </div>
            </th>
            <th v-if="$slots.actions" class="!top-[33px]" />
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="i in 6" :key="`s-${i}`">
              <td v-for="column in columns" :key="column.key"><div class="skeleton h-3.5 w-3/4" /></td>
              <td v-if="$slots.actions" />
            </tr>
          </template>
          <tr v-else-if="paged.length === 0">
            <td :colspan="columns.length + 1" class="py-12 text-center">
              <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Icon name="inbox" :size="22" /></div>
              <div class="mt-2 text-sm text-slate-400">{{ t('common.noData') }}</div>
            </td>
          </tr>
          <tr v-for="(row, index) in paged" v-else :key="rowKey ? String(row[rowKey]) : index" class="transition-colors" @click="emit('rowClick', row)">
            <td v-for="column in columns" :key="column.key" class="whitespace-nowrap" :class="column.class">
              <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
                {{ column.format ? column.format(row[column.key], row) : row[column.key] }}
              </slot>
            </td>
            <td v-if="$slots.actions" class="whitespace-nowrap text-right">
              <div class="inline-flex items-center gap-1"><slot name="actions" :row="row" /></div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
      <span>{{ t('common.perPage') }}</span>
      <select v-model.number="pageSize" class="input input-sm w-auto">
        <option v-for="size in [10, 25, 50, 100]" :key="size" :value="size">{{ size }}</option>
      </select>
      <div class="ml-auto flex items-center gap-1">
        <button class="btn-ghost btn-icon btn-sm" :disabled="page <= 1" @click="page = 1"><Icon name="chevrons-left" :size="15" /></button>
        <button class="btn-ghost btn-icon btn-sm" :disabled="page <= 1" @click="page -= 1"><Icon name="chevron-left" :size="15" /></button>
        <span class="tabular px-2">{{ t('common.page') }} <b class="text-slate-700">{{ page }}</b> {{ t('common.of') }} {{ pageCount }}</span>
        <button class="btn-ghost btn-icon btn-sm" :disabled="page >= pageCount" @click="page += 1"><Icon name="chevron-right" :size="15" /></button>
        <button class="btn-ghost btn-icon btn-sm" :disabled="page >= pageCount" @click="page = pageCount"><Icon name="chevrons-right" :size="15" /></button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { ExportColumn } from '~/utils/export';

export interface TableColumn {
  key: string;
  label: string;
  format?: (value: unknown, row: Record<string, any>) => string;
  options?: Array<{ value: string; label: string }>;
  filter?: boolean;
  class?: string;
  exportKey?: string;
}

const props = defineProps<{
  columns: TableColumn[];
  rows: Array<Record<string, any>>;
  loading?: boolean;
  rowKey?: string;
  title?: string;
  exportTitle?: string;
  exportable?: boolean;
  filterable?: boolean;
  initialPageSize?: number;
}>();
const emit = defineEmits<{ rowClick: [row: Record<string, any>] }>();
const { t } = useI18n();

const filters = reactive<Record<string, string>>({});
const sortKey = ref<string | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');
const page = ref(1);
const pageSize = ref(props.initialPageSize ?? 25);

const filtered = computed(() =>
  props.rows.filter((row) =>
    props.columns.every((column) => {
      const needle = (filters[column.key] ?? '').toString().trim().toLowerCase();
      if (!needle) return true;
      const raw = row[column.key];
      const text = (column.format ? column.format(raw, row) : String(raw ?? '')).toLowerCase();
      return column.options ? String(raw ?? '') === filters[column.key] : text.includes(needle) || String(raw ?? '').toLowerCase().includes(needle);
    }),
  ),
);

const sorted = computed(() => {
  if (!sortKey.value) return filtered.value;
  const key = sortKey.value;
  const direction = sortDir.value === 'asc' ? 1 : -1;
  return [...filtered.value].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (left === right) return 0;
    if (left === null || left === undefined || left === '') return 1;
    if (right === null || right === undefined || right === '') return -1;
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction;
    return String(left).localeCompare(String(right), undefined, { numeric: true }) * direction;
  });
});

const pageCount = computed(() => Math.max(1, Math.ceil(sorted.value.length / pageSize.value)));
const paged = computed(() => sorted.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));

const exportColumns = computed<ExportColumn[]>(() => props.columns.map((column) => ({ key: column.key, label: column.label })));
const exportRows = computed(() => sorted.value.map((row) => Object.fromEntries(props.columns.map((column) => [column.key, column.format ? column.format(row[column.key], row) : row[column.key]]))));

const toggleSort = (key: string) => {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  else {
    sortKey.value = key;
    sortDir.value = 'asc';
  }
};

watch([filtered, pageSize], () => {
  if (page.value > pageCount.value) page.value = pageCount.value;
});
</script>
