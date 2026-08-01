import { join } from 'node:path';

export const GrpcPackages = {
  common: 'common.v1',
  fleet: 'fleet.v1',
  geofence: 'geofence.v1',
  dispatch: 'dispatch.v1',
  analytics: 'analytics.v1',
} as const;

export type GrpcPackageName = (typeof GrpcPackages)[keyof typeof GrpcPackages];

export const protoDirectory = (): string => process.env.PROTO_DIR ?? join(process.cwd(), 'proto');

export const protoFiles: Record<GrpcPackageName, string> = {
  'common.v1': 'common.proto',
  'fleet.v1': 'fleet.proto',
  'geofence.v1': 'geofence.proto',
  'dispatch.v1': 'dispatch.proto',
  'analytics.v1': 'analytics.proto',
};

export const protoPathFor = (pkg: GrpcPackageName): string => join(protoDirectory(), protoFiles[pkg]);
