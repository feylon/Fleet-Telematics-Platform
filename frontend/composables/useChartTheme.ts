import { computed } from 'vue';
import { useBrandingStore } from '~/stores/branding';

export const CHART_PALETTE = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const useChartTheme = () => {
  const branding = useBrandingStore();
  const palette = computed(() => [branding.primaryColor, ...CHART_PALETTE]);

  const base = (overrides: Record<string, unknown> = {}) => ({
    chart: { toolbar: { show: false }, fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', foreColor: '#64748b', animations: { enabled: true, speed: 350 }, zoom: { enabled: false }, parentHeightOffset: 0 },
    colors: palette.value,
    stroke: { curve: 'smooth', width: 2.5, lineCap: 'round' },
    dataLabels: { enabled: false },
    grid: { borderColor: '#eef2f7', strokeDashArray: 4, padding: { left: 8, right: 8 } },
    legend: { position: 'top', horizontalAlign: 'left', fontSize: '12px', markers: { size: 6, shape: 'circle' } },
    tooltip: { theme: 'light', style: { fontSize: '12px' }, x: { format: 'dd.MM HH:mm:ss' }, marker: { show: true } },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 90, 100] } },
    xaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    ...overrides,
  });

  return { palette, base };
};
