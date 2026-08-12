<template>
  <div class="card">
    <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
      <slot name="toolbar" />
      <div class="ml-auto flex items-center gap-2">
        <span class="text-xs text-slate-500">{{ t('common.total') }}: {{ filtered.length }}</span>
        <ExportButtons v-if="exportable !== false" :title="exportTitle ?? title ?? 'table'" :columns="exportColumns" :rows="exportRows" />
      </div>
    </div>
    <div class="overflow-x-auto">
      <table class="table-dense w-full">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key" class="cursor-pointer select-none whitespace-nowrap" @click="toggleSort(column.key)">
              {{ column.label }}
              <span v-if="sortKey === column.key" class="text-primary">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th v-if="$slots.actions" class="text-right">{{ t('common.actions') }}</th>
          </tr>
          <tr v-if="filterable !== false">
            <th v-for="column in columns" :key="`f-${column.key}`" class="!py-1">
              <select v-if="column.options" v-model="filters[column.key]" class="input !py-0.5 text-xs font-normal normal-case tracking-normal">
                <option value="">{{ t('common.all') }}</option>
                <option v-for="option in column.options" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <input v-else-if="column.filter !== false" v-model="filters[column.key]" class="input !py-0.5 text-xs font-normal normal-case tracking-normal" :placeholder="t('common.filter')" />
            </th>
            <th v-if="$slots.actions" />
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length + 1" class="py-6 text-center text-sm text-slate-400">{{ t('common.loading') }}</td>
          </tr>
          <tr v-else-if="paged.length === 0">
            <td :colspan="columns.length + 1" class="py-6 text-center text-sm text-slate-400">{{ t('common.noData') }}</td>
          </tr>
          <tr v-for="(row, index) in paged" v-else :key="rowKey ? String(row[rowKey]) : index" class="hover:bg-slate-50" @click="emit('rowClick', row)">
            <td v-for="column in columns" :key="column.key" class="whitespace-nowrap" :class="column.class">
              <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
                {{ column.format ? column.format(row[column.key], row) : row[column.key] }}
              </slot>
            </td>
            <td v-if="$slots.actions" class="whitespace-nowrap text-right">
              <slot name="actions" :row="row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex flex-wrap items-center gap-2 border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
      <span>{{ t('common.perPage') }}</span>
      <select v-model.number="pageSize" class="input w-auto !py-0.5">
        <option v-for="size in [10, 25, 50, 100]" :key="size" :value="size">{{ size }}</option>
      </select>
      <div class="ml-auto flex items-center gap-1">
        <button class="btn-secondary btn-xs" :disabled="page <= 1" @click="page -= 1">‹</button>
        <span>{{ t('common.page') }} {{ page }} {{ t('common.of') }} {{ pageCount }}</span>
        <button class="btn-secondary btn-xs" :disabled="page >= pageCount" @click="page += 1">›</button>
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
