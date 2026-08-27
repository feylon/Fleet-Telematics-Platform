<template>
  <ClientOnly>
    <div class="grid gap-3 md:grid-cols-2">
      <div class="card card-body">
        <div class="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><Icon name="gauge" :size="14" />{{ t('live.speed') }} ({{ t('live.kmh') }})</div>
        <apexchart v-if="points.length" :key="`speed-${speedMax}`" type="area" height="220" :options="speedOptions" :series="speedSeries" />
        <div v-else class="flex h-[220px] items-center justify-center text-xs text-slate-400">{{ t('common.noData') }}</div>
      </div>
      <div class="card card-body">
        <div class="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><Icon name="fuel" :size="14" />{{ t('live.fuel') }} (%)</div>
        <apexchart v-if="points.length" type="area" height="220" :options="fuelOptions" :series="fuelSeries" />
        <div v-else class="flex h-[220px] items-center justify-center text-xs text-slate-400">{{ t('common.noData') }}</div>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SeriesPoint } from '~/composables/useAnalyticsApi';
import { useChartTheme } from '~/composables/useChartTheme';

const props = defineProps<{ points: SeriesPoint[]; cursorIndex?: number }>();
const { t } = useI18n();
const { base, palette } = useChartTheme();

const cursor = computed(() => (props.cursorIndex !== undefined && props.points[props.cursorIndex] ? { xaxis: [{ x: new Date(props.points[props.cursorIndex].timestamp).getTime(), borderColor: '#dc2626', strokeDashArray: 0, borderWidth: 2 }] } : {}));
const speedMax = computed(() => Math.max(10, Math.ceil(props.points.reduce((max, point) => Math.max(max, point.speed), 0) / 10) * 10));
const speedOptions = computed(() => base({ colors: [palette.value[0]], xaxis: { type: 'datetime', labels: { datetimeUTC: false, style: { fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } }, yaxis: { min: 0, max: speedMax.value, tickAmount: 5, labels: { formatter: (value: number) => value.toFixed(0), style: { fontSize: '11px' } } }, annotations: cursor.value, legend: { show: false } }));
const fuelOptions = computed(() => base({ colors: [palette.value[2]], xaxis: { type: 'datetime', labels: { datetimeUTC: false, style: { fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } }, yaxis: { min: 0, max: 100, labels: { formatter: (value: number) => value.toFixed(0), style: { fontSize: '11px' } } }, annotations: cursor.value, legend: { show: false } }));
const speedSeries = computed(() => [{ name: t('live.speed'), data: props.points.map((point) => [new Date(point.timestamp).getTime(), Number(point.speed.toFixed(1))]) }]);
const fuelSeries = computed(() => [{ name: t('live.fuel'), data: props.points.map((point) => [new Date(point.timestamp).getTime(), Number(point.fuelLevel.toFixed(1))]) }]);
</script>
