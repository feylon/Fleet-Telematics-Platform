export const KafkaTopics = {
  telemetryRaw: 'telemetry.raw',
  fleetAlerts: 'fleet.alerts',
  fleetEvents: 'fleet.events',
} as const;

export const KafkaTopicPartitions: Record<string, number> = {
  [KafkaTopics.telemetryRaw]: 12,
  [KafkaTopics.fleetAlerts]: 6,
  [KafkaTopics.fleetEvents]: 3,
};

export const KafkaConsumerGroups = {
  telemetryIngest: 'telemetry-ingest',
  alertsIngest: 'alerts-ingest',
  geofenceSafety: 'geofence-safety',
  geofenceEvents: 'geofence-events',
  gatewayLive: 'gateway-live',
  gatewayAlerts: 'gateway-alerts',
  gatewayEvents: 'gateway-events',
} as const;
