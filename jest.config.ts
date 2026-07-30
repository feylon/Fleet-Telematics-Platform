import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/apps', '<rootDir>/libs'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', isolatedModules: true }],
  },
  moduleNameMapper: {
    '^@fleet/common(|/.*)$': '<rootDir>/libs/common/src/$1',
    '^@fleet/database(|/.*)$': '<rootDir>/libs/database/src/$1',
  },
  testEnvironment: 'node',
  collectCoverageFrom: ['apps/**/*.ts', 'libs/**/*.ts', '!**/main.ts', '!**/*.module.ts'],
};

export default config;
