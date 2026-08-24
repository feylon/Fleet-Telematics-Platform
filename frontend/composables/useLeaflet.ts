import type * as LeafletNamespace from 'leaflet';

export type LeafletModule = typeof LeafletNamespace;

let cached: LeafletModule | null = null;

export const loadLeaflet = async (): Promise<LeafletModule> => {
  if (cached) return cached;
  const module = await import('leaflet');
  const L = (module.default ?? module) as LeafletModule;
  (window as unknown as { L: LeafletModule }).L = L;
  await import('leaflet.markercluster');
  try {
    await import('leaflet.heat');
  } catch {
    return L;
  }
  cached = L;
  return L;
};

export const TASHKENT: [number, number] = [41.3111, 69.2797];

export const tileLayerOptions = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors',
  subdomains: 'abc',
  maxZoom: 19,
};
