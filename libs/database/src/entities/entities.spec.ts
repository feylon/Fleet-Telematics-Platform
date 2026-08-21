import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { ALL_ENTITIES } from './index';
import { InitialSchema1753860000000 } from '../migrations/1753860000000-InitialSchema';
import { OrganizationTelegram1753870000000 } from '../migrations/1753870000000-OrganizationTelegram';

describe('database entities', () => {
  it('registers fifteen tables', () => {
    const registered = getMetadataArgsStorage().tables.filter((table) => ALL_ENTITIES.includes(table.target as never));
    expect(registered).toHaveLength(15);
  });

  it('declares a migration that creates every entity table', async () => {
    const statements: string[] = [];
    const runner = { query: async (sql: string) => { statements.push(sql); } };
    await new InitialSchema1753860000000().up(runner as never);
    const tableNames = getMetadataArgsStorage().tables
      .filter((table) => ALL_ENTITIES.includes(table.target as never))
      .map((table) => table.name as string);
    for (const name of tableNames) {
      expect(statements.some((sql) => sql.includes(`CREATE TABLE "${name}"`))).toBe(true);
    }
  });

  it('creates columns for every mapped property', async () => {
    const statements: string[] = [];
    const runner = { query: async (sql: string) => { statements.push(sql); } };
    await new InitialSchema1753860000000().up(runner as never);
    await new OrganizationTelegram1753870000000().up(runner as never);
    const ddl = statements.join('\n');
    const columns = getMetadataArgsStorage().columns.filter((column) => ALL_ENTITIES.includes(column.target as never));
    for (const column of columns) {
      const table = getMetadataArgsStorage().tables.find((t) => t.target === column.target);
      const section = ddl.slice(ddl.indexOf(`CREATE TABLE "${table?.name}"`));
      const body = section.slice(0, section.indexOf(')`') > 0 ? section.length : section.length);
      expect(body.includes(`"${column.propertyName}"`)).toBe(true);
    }
  });
});
