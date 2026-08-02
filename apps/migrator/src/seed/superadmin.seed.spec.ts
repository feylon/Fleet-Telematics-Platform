import { seedSuperadmin, SuperadminRepository, PasswordHasher, SUPERADMIN_LOGIN } from './superadmin.seed';

const hasher: PasswordHasher = { hash: async (plain) => `hashed:${plain}` };

const makeRepository = () => {
  const rows: Array<{ login: string; passwordHash: string; role: string }> = [];
  const repository: SuperadminRepository = {
    findByLogin: async (login) => {
      const row = rows.find((r) => r.login === login);
      return row ? { id: 'id', role: row.role } : null;
    },
    create: async (data) => {
      rows.push({ login: data.login, passwordHash: data.passwordHash, role: data.role });
    },
  };
  return { rows, repository };
};

describe('seedSuperadmin', () => {
  it('creates the superadmin with hashed password on first run', async () => {
    const { rows, repository } = makeRepository();
    const result = await seedSuperadmin(repository, hasher);
    expect(result).toBe('created');
    expect(rows).toHaveLength(1);
    expect(rows[0].login).toBe(SUPERADMIN_LOGIN);
    expect(rows[0].role).toBe('SUPERADMIN');
    expect(rows[0].passwordHash).toBe('hashed:superadmin01');
  });

  it('is idempotent on a second run', async () => {
    const { rows, repository } = makeRepository();
    await seedSuperadmin(repository, hasher);
    const result = await seedSuperadmin(repository, hasher);
    expect(result).toBe('exists');
    expect(rows).toHaveLength(1);
  });
});
