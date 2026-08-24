<template>
  <div class="inline-flex items-center rounded-lg border border-slate-200 bg-white shadow-card">
    <button class="btn-ghost btn-sm gap-1.5 rounded-r-none" :disabled="busy || rows.length === 0" :title="t('common.exportPdf')" @click="run('pdf')"><Icon name="file-text" :size="15" />{{ t('common.exportPdf') }}</button>
    <span class="h-5 w-px bg-slate-200" />
    <button class="btn-ghost btn-sm gap-1.5 rounded-l-none" :disabled="busy || rows.length === 0" :title="t('common.exportExcel')" @click="run('xlsx')"><Icon name="table" :size="15" />{{ t('common.exportExcel') }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { exportToExcel, exportToPdf, type ExportColumn } from '~/utils/export';
import { useToastStore } from '~/stores/toast';

const props = defineProps<{ title: string; columns: ExportColumn[]; rows: Array<Record<string, unknown>> }>();
const { t, locale } = useI18n();
const toast = useToastStore();
const busy = ref(false);

const run = async (format: 'pdf' | 'xlsx') => {
  busy.value = true;
  try {
    const exportLocale = locale.value === 'ru' ? 'ru' : 'uz';
    if (format === 'pdf') await exportToPdf(props.title, props.columns, props.rows, exportLocale);
    else await exportToExcel(props.title, props.columns, props.rows, exportLocale);
  } catch (error) {
    toast.error((error as Error).message);
  } finally {
    busy.value = false;
  }
};
</script>
