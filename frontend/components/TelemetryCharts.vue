<template>
  <ClientOnly>
    <div class="grid gap-3 md:grid-cols-2">
      <div class="card card-body">
        <div class="mb-1 text-xs font-semibold uppercase text-slate-500">{{ t('live.speed') }} ({{ t('live.kmh') }})</div>
        <apexchart type="area" height="220" :options="speedOptions" :series="speedSeries" />
      </div>
      <div class="card card-body">
        <div class="mb-1 text-xs font-semibold uppercase text-slate-500">{{ t('live.fuel') }} (%)</div>
        <apexchart type="line" height="220" :options="fuelOptions" :series="fuelSeries" />
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SeriesPoint } from '~/composables/useAnalyticsApi';

const props = defineProps<{ points: SeriesPoint[]; cursorIndex?: number }>();
const { t } = useI18n();

const baseOptions = (color: string) => ({
  chart: { toolbar: { show: false }, animations: { enabled: false }, zoom: { enabled: true } },
  stroke: { curve: 'smooth', width: 2 },
  colors: [color],
  dataLabels: { enabled: false },
  xaxis: { type: 'datetime', labels: { datetimeUTC: false } },
  tooltip: { x: { format: 'dd.MM HH:mm:ss' } },
  fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
  annotations: props.cursorIndex !== undefined && props.points[props.cursorIndex] ? { xaxis: [{ x: new Date(props.points[props.cursorIndex].timestamp).getTime(), borderColor: '#dc2626', strokeDashArray: 0 }] } : {},
});

const speedOptions = computed(() => ({ ...baseOptions('#2563eb'), yaxis: { min: 0, labels: { formatter: (value: number) => value.toFixed(0) } } }));
const fuelOptions = computed(() => ({ ...baseOptions('#f59e0b'), yaxis: { min: 0, max: 100, labels: { formatter: (value: number) => value.toFixed(0) } } }));
const speedSeries = computed(() => [{ name: t('live.speed'), data: props.points.map((point) => [new Date(point.timestamp).getTime(), Number(point.speed.toFixed(1))]) }]);
const fuelSeries = computed(() => [{ name: t('live.fuel'), data: props.points.map((point) => [new Date(point.timestamp).getTime(), Number(point.fuelLevel.toFixed(1))]) }]);
</script>
