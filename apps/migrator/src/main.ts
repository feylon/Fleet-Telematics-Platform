import 'reflect-metadata';
import { loadEnv } from '@fleet/common';
import { createDataSource } from '@fleet/database';
import { runSeeds } from './seed/seed-runner';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const connectWithRetry = async () => {
  const env = loadEnv('migrator');
  const dataSource = createDataSource(env);
  let attempt = 0;
  while (attempt < 30) {
    try {
      await dataSource.initialize();
      return dataSource;
    } catch (error) {
      attempt += 1;
      process.stdout.write(`postgres not ready (attempt ${attempt}): ${(error as Error).message}\n`);
      await sleep(2000);
    }
  }
  throw new Error('Could not connect to PostgreSQL');
};

const main = async () => {
  const dataSource = await connectWithRetry();
  const applied = await dataSource.runMigrations({ transaction: 'all' });
  process.stdout.write(`migrations applied: ${applied.map((m) => m.name).join(', ') || 'none'}\n`);
  await runSeeds(dataSource);
  await dataSource.destroy();
  process.stdout.write('migrator finished\n');
};

main().catch((error) => {
  process.stderr.write(`migrator failed: ${(error as Error).stack ?? String(error)}\n`);
  process.exit(1);
});
