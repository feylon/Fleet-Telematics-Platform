import { DataSource } from 'typeorm';
import { hashPassword } from '@fleet/common';
import { PlatformSetting, Role, User } from '@fleet/database';
import { seedSuperadmin } from './superadmin.seed';
import { seedPlatformSettings } from './platform.seed';

export const runSeeds = async (dataSource: DataSource): Promise<void> => {
  const users = dataSource.getRepository(User);
  const settings = dataSource.getRepository(PlatformSetting);

  const superadminResult = await seedSuperadmin(
    {
      findByLogin: async (login) => {
        const user = await users.findOne({ where: { login } });
        return user ? { id: user.id, role: user.role } : null;
      },
      create: async (data) => {
        await users.insert({
          login: data.login,
          passwordHash: data.passwordHash,
          role: data.role as Role,
          fullName: data.fullName,
          locale: data.locale,
          organizationId: null,
          isActive: true,
        });
      },
    },
    { hash: hashPassword },
  );

  const settingsResult = await seedPlatformSettings({
    exists: async () => (await settings.count()) > 0,
    create: async (data) => {
      await settings.insert(data);
    },
  });

  process.stdout.write(`seed superadmin: ${superadminResult}\n`);
  process.stdout.write(`seed platform settings: ${settingsResult}\n`);
};
