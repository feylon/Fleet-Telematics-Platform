import { Role } from '@fleet/database';

export interface SuperadminRepository {
  findByLogin(login: string): Promise<{ id: string; role: string } | null>;
  create(data: { login: string; passwordHash: string; role: Role; fullName: string; locale: string }): Promise<void>;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
}

export const SUPERADMIN_LOGIN = 'superadmin01';
export const SUPERADMIN_PASSWORD = 'superadmin01';

export const seedSuperadmin = async (repository: SuperadminRepository, hasher: PasswordHasher): Promise<'created' | 'exists'> => {
  const existing = await repository.findByLogin(SUPERADMIN_LOGIN);
  if (existing) return 'exists';
  const passwordHash = await hasher.hash(SUPERADMIN_PASSWORD);
  await repository.create({
    login: SUPERADMIN_LOGIN,
    passwordHash,
    role: Role.SUPERADMIN,
    fullName: 'Platform Superadmin',
    locale: 'uz',
  });
  return 'created';
};
