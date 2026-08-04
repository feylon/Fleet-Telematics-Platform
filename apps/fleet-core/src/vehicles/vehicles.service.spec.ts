import { VehiclesService } from './vehicles.service';
import { applyVehicleInput } from './vehicle.mapper';
import { FuelType, Vehicle, VehicleStatus } from '@fleet/database';

const repoSpy = () => {
  const calls: unknown[] = [];
  return {
    calls,
    repo: {
      findOne: async (options: unknown) => {
        calls.push(options);
        return null;
      },
      findAndCount: async (options: unknown) => {
        calls.push(options);
        return [[], 0];
      },
      find: async () => [],
      create: () => ({}),
      save: async (entity: Vehicle) => ({ ...entity, id: 'v1', createdAt: new Date(), updatedAt: new Date() }),
      delete: async () => undefined,
    },
  };
};

describe('VehiclesService tenant scoping', () => {
  it('always scopes list queries by organizationId', async () => {
    const { calls, repo } = repoSpy();
    const service = new VehiclesService(repo as never, { find: async () => [] } as never, { find: async () => [] } as never, { emit: async () => undefined } as never);
    await service.list({ organizationId: 'org-a', search: 'abc' });
    const options = calls[0] as { where: Array<{ organizationId: string }> };
    expect(Array.isArray(options.where)).toBe(true);
    expect(options.where.every((clause) => clause.organizationId === 'org-a')).toBe(true);
  });

  it('scopes get by id and organization', async () => {
    const { calls, repo } = repoSpy();
    const service = new VehiclesService(repo as never, { find: async () => [] } as never, { find: async () => [] } as never, { emit: async () => undefined } as never);
    await expect(service.get('v1', 'org-b')).rejects.toBeDefined();
    expect(calls[0]).toEqual({ where: { id: 'v1', organizationId: 'org-b' } });
  });
});

describe('applyVehicleInput', () => {
  it('normalizes plate, defaults and empties', () => {
    const vehicle = applyVehicleInput(new Vehicle(), { organizationId: 'o', plateNumber: ' 01a123bc ', brand: 'Isuzu', model: 'NQR', fuelType: 'nope', year: 0, vin: '' });
    expect(vehicle.plateNumber).toBe('01A123BC');
    expect(vehicle.fuelType).toBe(FuelType.DIESEL);
    expect(vehicle.status).toBe(VehicleStatus.ACTIVE);
    expect(vehicle.year).toBeNull();
    expect(vehicle.vin).toBeNull();
    expect(vehicle.maxSpeedKmh).toBe(90);
  });
});
