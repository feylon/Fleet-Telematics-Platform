export interface PlatformSettingsRepository {
  exists(): Promise<boolean>;
  create(data: { id: number; platformName: string; description: string; primaryColor: string }): Promise<void>;
}

export const seedPlatformSettings = async (repository: PlatformSettingsRepository): Promise<'created' | 'exists'> => {
  if (await repository.exists()) return 'exists';
  await repository.create({
    id: 1,
    platformName: 'FleetView',
    description: 'Real-time logistics and fleet telematics platform',
    primaryColor: '#0ea5e9',
  });
  return 'created';
};
