<template>
  <div class="flex gap-1">
    <button class="btn-secondary btn-xs" :disabled="busy || rows.length === 0" @click="run('pdf')">📄 {{ t('common.exportPdf') }}</button>
    <button class="btn-secondary btn-xs" :disabled="busy || rows.length === 0" @click="run('xlsx')">📊 {{ t('common.exportExcel') }}</button>
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
