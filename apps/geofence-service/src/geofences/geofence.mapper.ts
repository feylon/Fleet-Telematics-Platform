import { isoOrEmpty, LngLat, numberOrZero, rpcInvalid, stringOrEmpty } from '@fleet/common';
import { Geofence, GeoJsonPolygon } from '@fleet/database';
import { GeofenceRule } from '../rules/rule-engine';

export interface GeofenceInput {
  organizationId: string;
  name: string;
  description?: string;
  polygonGeojson: string;
  speedLimitKmh?: number;
  allowedFrom?: string;
  allowedTo?: string;
  alertOnEnter?: boolean;
  alertOnExit?: boolean;
  color?: string;
  isActive?: boolean;
}

export const parsePolygon = (raw: string): GeoJsonPolygon => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw rpcInvalid('polygon_geojson must be valid JSON');
  }
  const polygon = parsed as Partial<GeoJsonPolygon>;
  if (polygon?.type !== 'Polygon' || !Array.isArray(polygon.coordinates) || polygon.coordinates.length === 0) throw rpcInvalid('polygon_geojson must be a GeoJSON Polygon');
  for (const ring of polygon.coordinates) {
    if (!Array.isArray(ring) || ring.length < 4) throw rpcInvalid('Each ring needs at least four positions');
    for (const position of ring) {
      if (!Array.isArray(position) || position.length < 2 || typeof position[0] !== 'number' || typeof position[1] !== 'number') throw rpcInvalid('Positions must be [longitude, latitude]');
      if (position[0] < -180 || position[0] > 180 || position[1] < -90 || position[1] > 90) throw rpcInvalid('Position out of range');
    }
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);
  }
  return { type: 'Polygon', coordinates: polygon.coordinates as [number, number][][] };
};

const timeOrNull = (value: string | undefined): string | null => {
  if (!value) return null;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(value)) throw rpcInvalid('Time must be HH:MM');
  return value.length === 5 ? `${value}:00` : value;
};

export const applyGeofenceInput = (geofence: Geofence, input: GeofenceInput): Geofence => {
  if (!input.organizationId) throw rpcInvalid('organizationId is required');
  if (!input.name || input.name.trim().length < 2) throw rpcInvalid('name is required');
  geofence.organizationId = input.organizationId;
  geofence.name = input.name.trim();
  geofence.description = input.description || null;
  geofence.polygon = parsePolygon(input.polygonGeojson);
  geofence.speedLimitKmh = input.speedLimitKmh && input.speedLimitKmh > 0 ? input.speedLimitKmh : null;
  geofence.allowedFrom = timeOrNull(input.allowedFrom);
  geofence.allowedTo = timeOrNull(input.allowedTo);
  geofence.alertOnEnter = input.alertOnEnter ?? geofence.alertOnEnter ?? true;
  geofence.alertOnExit = input.alertOnExit ?? geofence.alertOnExit ?? true;
  geofence.color = input.color && input.color !== '' ? input.color : geofence.color ?? '#2563eb';
  geofence.isActive = input.isActive ?? geofence.isActive ?? true;
  return geofence;
};

export const toGeofenceMessage = (geofence: Geofence) => ({
  id: geofence.id,
  organizationId: geofence.organizationId,
  name: geofence.name,
  description: stringOrEmpty(geofence.description),
  polygonGeojson: JSON.stringify(geofence.polygon),
  speedLimitKmh: numberOrZero(geofence.speedLimitKmh),
  allowedFrom: stringOrEmpty(geofence.allowedFrom),
  allowedTo: stringOrEmpty(geofence.allowedTo),
  alertOnEnter: geofence.alertOnEnter,
  alertOnExit: geofence.alertOnExit,
  color: geofence.color,
  isActive: geofence.isActive,
  createdAt: isoOrEmpty(geofence.createdAt),
  updatedAt: isoOrEmpty(geofence.updatedAt),
});

export const toGeofenceRule = (geofence: Geofence): GeofenceRule => ({
  id: geofence.id,
  name: geofence.name,
  rings: geofence.polygon.coordinates as LngLat[][],
  speedLimitKmh: geofence.speedLimitKmh,
  allowedFrom: geofence.allowedFrom ? geofence.allowedFrom.slice(0, 5) : null,
  allowedTo: geofence.allowedTo ? geofence.allowedTo.slice(0, 5) : null,
  alertOnEnter: geofence.alertOnEnter,
  alertOnExit: geofence.alertOnExit,
});
