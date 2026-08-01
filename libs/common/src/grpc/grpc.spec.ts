import { loadSync } from '@grpc/proto-loader';
import { loadPackageDefinition } from '@grpc/grpc-js';
import { GrpcPackages, protoPathFor } from './packages';
import { grpcServerOptions } from './grpc-options';

const serviceNames = (pkgName: string, protoPath: string): string[] => {
  const definition = loadSync(protoPath, { includeDirs: [protoPath.replace(/[^/]+$/, '')] });
  const loaded = loadPackageDefinition(definition) as Record<string, Record<string, unknown>>;
  const pkg = pkgName.split('.').reduce<Record<string, unknown>>((acc, key) => acc[key] as Record<string, unknown>, loaded as never);
  return Object.keys(pkg).filter((key) => typeof pkg[key] === 'function');
};

describe('proto contracts', () => {
  it('loads fleet services', () => {
    expect(serviceNames(GrpcPackages.fleet, protoPathFor('fleet.v1')).sort()).toEqual([
      'DeviceService',
      'DriverService',
      'MaintenanceService',
      'VehicleService',
    ]);
  });

  it('loads geofence service', () => {
    expect(serviceNames(GrpcPackages.geofence, protoPathFor('geofence.v1'))).toEqual(['GeofenceService']);
  });

  it('loads dispatch services', () => {
    expect(serviceNames(GrpcPackages.dispatch, protoPathFor('dispatch.v1')).sort()).toEqual(['OrderService', 'RouteService']);
  });

  it('loads analytics service', () => {
    expect(serviceNames(GrpcPackages.analytics, protoPathFor('analytics.v1'))).toEqual(['AnalyticsService']);
  });

  it('builds server options with the common package included', () => {
    const options = grpcServerOptions('fleet.v1', '0.0.0.0:50051');
    expect(options.options.package).toEqual(['fleet.v1', 'common.v1']);
    expect(options.options.url).toBe('0.0.0.0:50051');
  });
});
